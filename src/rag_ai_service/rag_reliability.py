from langchain_core.prompts import ChatPromptTemplate
import pandas as pd
import numpy as np
import math
import re
import datetime
from urllib.parse import urlparse
from langchain_groq import ChatGroq
from langchain_tavily import TavilySearch
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
import faiss

from pydantic import BaseModel, Field
import requests
import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from pymongo import MongoClient

router = APIRouter()

load_dotenv("../../.env")

client = MongoClient(os.environ["MONGODB_URI"])
db = client["quotio"]
collection_recall_pre2010 = db["recalldatapre2010"]
collection_recall_post2010 = db["recalldatapost2010"]
collection_invdata = db["invdatas"]

# --- Reliability scoring weights (tune against known-good / known-bad vehicles) ---
RECALL_WEIGHT = 1.0
INVESTIGATION_WEIGHT = 2.15
COMPLAINT_WEIGHT = 1.0
SCALE = 60.0

CONCENTRATION_FLAG_THRESHOLD = 0.4

# --- Semantic clustering config ---
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
SIMILARITY_THRESHOLD = 0.82
NEIGHBOR_SEARCH_K = 8
MIN_CLUSTER_SIZE = 2
TOP_N_CLUSTERS = 8

# --- Web-signal weighting ---
WEB_WEIGHT_BASE = 1.0
WEB_SCALE = 40.0
SPARSITY_K = 2.0

# --- Domain authority table ---
DOMAIN_AUTHORITY_WEIGHTS = {
    "consumerreports.org": 1.0,
    "jdpower.com": 1.0,
    "carcomplaints.com": 0.9,
    "edmunds.com": 0.9,
    "repairpal.com": 0.85,
    "kbb.com": 0.8,
    "caranddriver.com": 0.8,
    "motortrend.com": 0.8,
    "cars.com": 0.7,
    "autotrader.com": 0.65,
    "reddit.com": 0.55,
    "forums.com": 0.3,  # placeholder pattern; real forum domains vary widely
}
DEFAULT_DOMAIN_WEIGHT = 0.5

# --- Tiered search / aggregation config ---
PRIMARY_AUTHORITY_THRESHOLD = 0.7
PRIMARY_DOMAINS = [
    d for d, w in DOMAIN_AUTHORITY_WEIGHTS.items() if w >= PRIMARY_AUTHORITY_THRESHOLD
]
MIN_PRIMARY_SOURCES_FOR_SEARCH = 2
MIN_PRIMARY_SOURCES_FOR_FULL_CONFIDENCE = 2
SUPPLEMENTARY_MAX_INFLUENCE = 0.15
SUPPLEMENTARY_ONLY_CONFIDENCE_CAP = 0.4

# --- Content-quality config (fixes weak extraction from truncated snippets) ---
CONTENT_TRUNCATE_CHARS = 4000          # per-source extraction can afford more than the old 500/2000
MIN_CONTENT_LENGTH_FOR_TRUST = 300     # below this, attempt a direct-fetch fallback
FALLBACK_FETCH_TIMEOUT_SECONDS = 5

# --- Recall/investigation age-normalization ---
# A count of recalls/investigations concentrated in a short ownership history is
# a stronger signal than the same count spread over a mature model's history.
BASE_AGE_YEARS = 5.0        # reference age at which the amplifier is 1.0 (neutral)
MAX_AGE_AMPLIFIER = 2.5     # cap so very-new vehicles don't get an unbounded multiplier
RECALL_VOLUME_WEIGHT = 0.5       # blends raw recall count alongside component-recurrence
INVESTIGATION_VOLUME_WEIGHT = 0.5

_embedding_model = None


class CarRequest(BaseModel):
    make: str = Field(..., examples=["Honda"])
    model: str = Field(..., examples=["Civic"])
    year: int = Field(..., examples=[2016])


class SourceReliabilitySignal(BaseModel):
    reliability_rating: int = Field(
        ..., ge=0, le=100,
        description="0 = this source describes the vehicle as very unreliable, "
                    "100 = very reliable. Use 50 only if this source truly makes "
                    "no reliability claim at all."
    )
    claim_specificity: float = Field(
        ..., ge=0.0, le=1.0,
        description="Does this source contain CONCRETE reliability evidence? This "
                    "includes named components/failure modes, but ALSO counts: "
                    "recall counts, numeric rankings (e.g. JD Power scores, "
                    "Consumer Reports predicted-reliability ratings), named "
                    "quality-control problems, or specific owner-reported issues -- "
                    "even without deep technical detail. 0 = purely generic/"
                    "promotional text with no evidence at all, 1 = clearly "
                    "substantive. Do not require highly technical language to "
                    "count as specific."
    )
    recurring_issues_mentioned: list[str] = Field(
        default_factory=list,
        description="Specific problems this source names. Empty if none named."
    )


class WebReliabilitySignal(BaseModel):
    reliability_rating: int
    recurring_issues_mentioned: list[str]
    source_agreement: str
    confidence: float
    primary_source_count: int
    supplementary_source_count: int
    sources_used: list[dict]


def _get_embedding_model() -> HuggingFaceEmbeddings:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    return _embedding_model


class _UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def _top_component_summary(df: pd.DataFrame, component_col: str = "component", top_n: int = 10) -> str:
    if len(df) == 0 or component_col not in df.columns:
        return "None"
    counts = df[component_col].value_counts().head(top_n)
    return "\n".join(f"{comp}: {count} occurrence(s)" for comp, count in counts.items())


def _commonality_penalty_from_components(df: pd.DataFrame, component_col: str = "component") -> float:
    """Component-recurrence penalty only -- kept separate from volume so the two
    signals can be reported and tuned independently.
    """
    if len(df) == 0 or component_col not in df.columns:
        return 0.0
    counts = df[component_col].value_counts()
    return float(sum(math.log1p(c) for c in counts))


def _vehicle_age_years(model_year: int) -> float:
    current_year = datetime.date.today().year
    return max(1.0, float(current_year - model_year + 1))  # model year itself = year 1


def _age_amplifier(age_years: float) -> float:
    """>1 for vehicles younger than BASE_AGE_YEARS, 1.0 at the reference age,
    <1 (but not implemented as a discount here -- floored at 1.0) for older ones.
    We only amplify for young vehicles; we don't want an old, well-understood
    model's recalls to be discounted just for being old.
    """
    raw = math.sqrt(BASE_AGE_YEARS / age_years)
    return min(max(raw, 1.0), MAX_AGE_AMPLIFIER) if age_years < BASE_AGE_YEARS else 1.0


def _recall_investigation_penalties(
    combined_recall_df: pd.DataFrame, inv_df: pd.DataFrame, model_year: int
) -> dict:
    """Blends component-recurrence (existing signal) with raw volume (log-dampened),
    then amplifies both for young vehicles -- a handful of recalls spread across
    different systems in a vehicle's first year or two is a stronger signal than
    the same count over a decade-old model, even though no single component recurs.
    """
    age_years = _vehicle_age_years(model_year)
    amplifier = _age_amplifier(age_years)

    recall_commonality = _commonality_penalty_from_components(combined_recall_df)
    inv_commonality = _commonality_penalty_from_components(inv_df)

    recall_volume = math.log1p(len(combined_recall_df))
    inv_volume = math.log1p(len(inv_df))

    recall_penalty = RECALL_WEIGHT * (recall_commonality + RECALL_VOLUME_WEIGHT * recall_volume) * amplifier
    investigation_penalty = INVESTIGATION_WEIGHT * (inv_commonality + INVESTIGATION_VOLUME_WEIGHT * inv_volume) * amplifier

    return {
        "recall_penalty": recall_penalty,
        "investigation_penalty": investigation_penalty,
        "vehicle_age_years": age_years,
        "age_amplifier": round(amplifier, 2),
    }


def _semantic_common_issues(complaints_json: list[dict]) -> tuple[list[dict], str]:
    texts, meta = [], []
    for c in complaints_json:
        summary = (c.get("summary") or "").strip()
        if len(summary) < 20:
            continue
        texts.append(summary)
        meta.append(c)

    if len(texts) < 2:
        return [], "Not enough complaint text to detect recurring patterns."

    embedder = _get_embedding_model()
    vectors = np.array(embedder.embed_documents(texts), dtype="float32")
    faiss.normalize_L2(vectors)

    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    k = min(NEIGHBOR_SEARCH_K, len(texts))
    similarities, neighbor_ids = index.search(vectors, k)

    uf = _UnionFind(len(texts))
    for i in range(len(texts)):
        for sim, j in zip(similarities[i], neighbor_ids[i]):
            if j != i and sim >= SIMILARITY_THRESHOLD:
                uf.union(i, j)

    raw_clusters: dict[int, list[int]] = {}
    for i in range(len(texts)):
        root = uf.find(i)
        raw_clusters.setdefault(root, []).append(i)

    ranked = sorted(raw_clusters.values(), key=len, reverse=True)
    common_clusters = [idxs for idxs in ranked if len(idxs) >= MIN_CLUSTER_SIZE][:TOP_N_CLUSTERS]

    if not common_clusters:
        return [], "No recurring complaint patterns found -- complaints appear to be one-off."

    results = []
    for idxs in common_clusters:
        rep_idx = max(idxs, key=lambda i: len(texts[i]))
        results.append({
            "size": len(idxs),
            "component": meta[rep_idx].get("components", "Unknown"),
            "representative_summary": texts[rep_idx][:400],
        })

    context_lines = [
        f"Recurring issue (reported in {r['size']} complaints, component: {r['component']}): "
        f"{r['representative_summary']}"
        for r in results
    ]
    return results, "\n\n".join(context_lines)


def _cluster_concentration_flag(common_clusters: list[dict], total_complaints_considered: int) -> str:
    if not common_clusters or total_complaints_considered == 0:
        return "No dominant recurring issue detected."
    top = common_clusters[0]
    share = top["size"] / total_complaints_considered
    if share >= CONCENTRATION_FLAG_THRESHOLD:
        return (
            f"SYSTEMIC ISSUE FLAG: the '{top['component']}' issue cluster accounts for "
            f"{share:.0%} of clustered complaints ({top['size']} reports of the same "
            f"underlying problem). This is a recurring, not incidental, problem."
        )
    return f"No single issue dominates (largest recurring cluster: '{top['component']}' at {share:.0%})."


def _domain_of(url: str) -> str:
    if not url:
        return "unknown"
    try:
        return urlparse(url).netloc.lower().replace("www.", "") or "unknown"
    except ValueError:
        return "unknown"


def _domain_authority(url: str) -> float:
    netloc = _domain_of(url)
    for domain, weight in DOMAIN_AUTHORITY_WEIGHTS.items():
        if domain in netloc:
            return weight
    return DEFAULT_DOMAIN_WEIGHT


_HTML_TAG_RE = re.compile(r"<[^>]+>")
_HTML_SCRIPT_STYLE_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_WHITESPACE_RE = re.compile(r"\s+")


def _fallback_fetch_page_text(url: str) -> str:
    """Best-effort direct fetch when Tavily's content is too short to judge.
    No external HTML-parsing dependency required -- strips tags with regex,
    which is good enough for extracting readable body text, not for anything
    structural. Fails silently (returns "") on any error so a scrape failure
    never breaks the request.
    """
    if not url:
        return ""
    try:
        resp = requests.get(
            url,
            timeout=FALLBACK_FETCH_TIMEOUT_SECONDS,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ReliabilityBot/1.0)"},
        )
        resp.raise_for_status()
        text = _HTML_SCRIPT_STYLE_RE.sub(" ", resp.text)
        text = _HTML_TAG_RE.sub(" ", text)
        text = _WHITESPACE_RE.sub(" ", text).strip()
        return text
    except Exception:
        return ""


def _tavily_search(tavily: TavilySearch, query: str, domains: list[str] | None, max_results: int) -> list[dict]:
    try:
        payload = {"query": query}
        if domains:
            payload["include_domains"] = domains
        results = tavily.invoke(payload)
    except TypeError:
        results = tavily.invoke({"query": query})

    items = results.get("results", [])
    if domains:
        items = [r for r in items if any(d in _domain_of(r.get("url", "")) for d in domains)]
    return items[:max_results]


def _build_doc_from_result(r: dict, tier: str) -> Document | None:
    url = r.get("url", "")
    content = r.get("raw_content") or r.get("content") or ""
    content = content.strip()

    # If Tavily didn't give us enough to work with, try fetching the page directly
    # -- this is what fixes "high domain authority but low claim specificity"
    # when the real cause was a too-short snippet, not a genuinely vague source.
    if len(content) < MIN_CONTENT_LENGTH_FOR_TRUST:
        fetched = _fallback_fetch_page_text(url)
        if len(fetched) > len(content):
            content = fetched

    if len(content) < 50:
        return None

    return Document(
        page_content=content[:CONTENT_TRUNCATE_CHARS],
        metadata={"source": url, "title": r.get("title", ""), "tier": tier},
    )


def _gather_tavily_reliability_docs(make: str, model: str, year: int, tavily: TavilySearch) -> list[Document]:
    docs: list[Document] = []
    reliability_query = f"{year} {make} {model} reliability"
    known_issue_query = f"{year} {make} {model} most common problems reported by owners"

    tier1_items = []
    for query in (reliability_query, known_issue_query):
        tier1_items.extend(_tavily_search(tavily, query, domains=PRIMARY_DOMAINS, max_results=3))

    seen_urls = set()
    for r in tier1_items:
        url = r.get("url", "")
        if url in seen_urls:
            continue
        doc = _build_doc_from_result(r, tier="primary")
        if doc is None:
            continue
        seen_urls.add(url)
        docs.append(doc)

    distinct_primary_domains = {_domain_of(d.metadata["source"]) for d in docs}

    if len(distinct_primary_domains) < MIN_PRIMARY_SOURCES_FOR_SEARCH:
        fallback_query = f"{year} {make} {model} owner reviews reliability reddit forum experience"
        tier2_items = _tavily_search(tavily, fallback_query, domains=None, max_results=3)
        for r in tier2_items:
            url = r.get("url", "")
            if url in seen_urls:
                continue
            doc = _build_doc_from_result(r, tier="supplementary")
            if doc is None:
                continue
            seen_urls.add(url)
            docs.append(doc)

    return docs


def _extract_source_signal(
    extraction_llm, doc: Document, make: str, model: str, year: int
) -> SourceReliabilitySignal:
    prompt = f"""
    Based ONLY on the following single web source about the {year} {make} {model}'s
    reliability, extract a structured assessment of what THIS source claims.

    If this source doesn't actually make a reliability claim, set claim_specificity
    low and reliability_rating to 50 rather than guessing. But if the source DOES
    describe the vehicle as reliable/unreliable, cites a ranking, mentions recalls,
    or names specific problems -- treat that as specific evidence even if it's not
    deeply technical.

    Source: {doc.metadata.get('title', 'Unknown')}
    Content:
    {doc.page_content}
    """
    try:
        return extraction_llm.invoke(prompt)
    except Exception:
        return SourceReliabilitySignal(reliability_rating=50, claim_specificity=0.0, recurring_issues_mentioned=[])


def _weighted_stats(weights: list[float], ratings: list[float]):
    if not weights:
        return None
    w = np.array(weights, dtype="float64")
    r = np.array(ratings, dtype="float64")
    mean = float(np.average(r, weights=w))
    variance = float(np.average((r - mean) ** 2, weights=w))
    return mean, math.sqrt(variance), float(np.mean(w)), len(w)


def _aggregate_web_signals(
    documents_tavily: list[Document], per_source_signals: list[SourceReliabilitySignal]
) -> WebReliabilitySignal:
    if not documents_tavily or not per_source_signals:
        return WebReliabilitySignal(
            reliability_rating=50, recurring_issues_mentioned=[], source_agreement="low",
            confidence=0.0, primary_source_count=0, supplementary_source_count=0, sources_used=[],
        )

    sources_used = []
    primary_weights, primary_ratings = [], []
    supplementary_weights, supplementary_ratings = [], []
    all_issues: list[str] = []

    for doc, signal in zip(documents_tavily, per_source_signals):
        domain_weight = _domain_authority(doc.metadata.get("source", ""))
        effective_weight = domain_weight * signal.claim_specificity
        tier = doc.metadata.get("tier") or ("primary" if domain_weight >= PRIMARY_AUTHORITY_THRESHOLD else "supplementary")

        sources_used.append({
            "domain": _domain_of(doc.metadata.get("source", "")),
            "tier": tier,
            "domain_authority": round(domain_weight, 2),
            "claim_specificity": round(signal.claim_specificity, 2),
            "effective_weight": round(effective_weight, 2),
            "reliability_rating": signal.reliability_rating,
            "content_length": len(doc.page_content),
        })

        if effective_weight <= 0:
            continue

        all_issues.extend(signal.recurring_issues_mentioned)
        if tier == "primary":
            primary_weights.append(effective_weight)
            primary_ratings.append(signal.reliability_rating)
        else:
            supplementary_weights.append(effective_weight)
            supplementary_ratings.append(signal.reliability_rating)

    primary_stats = _weighted_stats(primary_weights, primary_ratings)
    supplementary_stats = _weighted_stats(supplementary_weights, supplementary_ratings)

    if primary_stats:
        p_mean, p_std, p_avg_weight, p_count = primary_stats
        agreement_factor = max(0.0, 1 - min(p_std / 50, 1.0))
        source_count_factor = min(p_count / MIN_PRIMARY_SOURCES_FOR_FULL_CONFIDENCE, 1.0)
        confidence = max(0.0, min(1.0, p_avg_weight * agreement_factor * source_count_factor))

        final_rating = p_mean
        if supplementary_stats:
            s_mean, *_ = supplementary_stats
            final_rating = (1 - SUPPLEMENTARY_MAX_INFLUENCE) * p_mean + SUPPLEMENTARY_MAX_INFLUENCE * s_mean

        agreement = "high" if p_std < 15 else "medium" if p_std < 30 else "low"

    elif supplementary_stats:
        s_mean, s_std, s_avg_weight, s_count = supplementary_stats
        agreement_factor = max(0.0, 1 - min(s_std / 50, 1.0))
        source_count_factor = min(s_count / MIN_PRIMARY_SOURCES_FOR_FULL_CONFIDENCE, 1.0)
        confidence = min(SUPPLEMENTARY_ONLY_CONFIDENCE_CAP, s_avg_weight * agreement_factor * source_count_factor)
        final_rating = s_mean
        agreement = "high" if s_std < 15 else "medium" if s_std < 30 else "low"

    else:
        return WebReliabilitySignal(
            reliability_rating=50, recurring_issues_mentioned=[], source_agreement="low",
            confidence=0.0, primary_source_count=0, supplementary_source_count=0, sources_used=sources_used,
        )

    seen = set()
    deduped_issues = []
    for issue in all_issues:
        key = issue.strip().lower()
        if key and key not in seen:
            seen.add(key)
            deduped_issues.append(issue.strip())

    return WebReliabilitySignal(
        reliability_rating=round(final_rating),
        recurring_issues_mentioned=deduped_issues[:10],
        source_agreement=agreement,
        confidence=round(confidence, 2),
        primary_source_count=len(primary_weights),
        supplementary_source_count=len(supplementary_weights),
        sources_used=sources_used,
    )


def _build_web_reliability_signal(
    llm: ChatGroq, documents_tavily: list[Document], make: str, model: str, year: int
) -> WebReliabilitySignal:
    extraction_llm = llm.with_structured_output(SourceReliabilitySignal)
    per_source_signals = [
        _extract_source_signal(extraction_llm, doc, make, model, year)
        for doc in documents_tavily
    ]
    return _aggregate_web_signals(documents_tavily, per_source_signals)


def _web_penalty(signal: WebReliabilitySignal, nhtsa_volume: int) -> float:
    sparsity_multiplier = 1 + (SPARSITY_K / (1 + math.log1p(nhtsa_volume)))
    unreliability_fraction = (100 - signal.reliability_rating) / 100
    return WEB_WEIGHT_BASE * sparsity_multiplier * signal.confidence * unreliability_fraction * WEB_SCALE


def _reliability_score(
    combined_recall_df: pd.DataFrame,
    inv_df: pd.DataFrame,
    common_clusters: list[dict],
    web_signal: WebReliabilitySignal,
    model_year: int,
) -> dict:
    ri = _recall_investigation_penalties(combined_recall_df, inv_df, model_year)
    recall_penalty = ri["recall_penalty"]
    investigation_penalty = ri["investigation_penalty"]

    complaint_penalty = COMPLAINT_WEIGHT * sum(math.log1p(c["size"]) for c in common_clusters)

    nhtsa_volume = len(combined_recall_df) + len(inv_df) + sum(c["size"] for c in common_clusters)
    web_pen = _web_penalty(web_signal, nhtsa_volume)

    penalty = recall_penalty + investigation_penalty + complaint_penalty + web_pen
    score = 100.0 / (1.0 + penalty / SCALE)

    if score >= 85:
        tier = "Excellent"
    elif score >= 70:
        tier = "Good"
    elif score >= 60:
        tier = "Fair"
    elif score >= 50:
        tier = "Deficient"
    elif score >= 30:
        tier = "Poor"
    else:
        tier = "Critical"

    return {
        "score": round(score, 1),
        "tier": tier,
        "penalty_breakdown": {
            "recall_penalty": round(recall_penalty, 1),
            "investigation_penalty": round(investigation_penalty, 1),
            "complaint_recurrence_penalty": round(complaint_penalty, 1),
            "web_reputation_penalty": round(web_pen, 1),
            "total_penalty": round(penalty, 1),
            "vehicle_age_years": ri["vehicle_age_years"],
            "age_amplifier": ri["age_amplifier"],
        },
        "raw_counts": {
            "recalls": len(combined_recall_df),
            "investigations": len(inv_df),
            "recurring_issue_clusters": len(common_clusters),
            "nhtsa_data_volume": nhtsa_volume,
        },
        "web_signal": web_signal.model_dump(),
    }


@router.post("/rag-reliability")
async def reliability_summary(req: CarRequest):
    try:
        mongo_vehicle_query = {"make": req.make.upper(), "model": req.model.upper(), "year": str(req.year)}

        pre_2010_recall_doc = collection_recall_pre2010.find(mongo_vehicle_query)
        post_2010_recall_doc = collection_recall_post2010.find(mongo_vehicle_query)
        inv_doc = collection_invdata.find(mongo_vehicle_query)

        pre_2010_df = pd.DataFrame(list(pre_2010_recall_doc))
        post_2010_df = pd.DataFrame(list(post_2010_recall_doc))
        df_inv = pd.DataFrame(list(inv_doc))

        for df in (pre_2010_df, post_2010_df, df_inv):
            if "_id" in df.columns:
                df.drop(columns=["_id"], inplace=True)

        combined_recall_df = pd.concat([pre_2010_df, post_2010_df], ignore_index=True)

        complaints_URI = f"https://api.nhtsa.gov/complaints/complaintsByVehicle?make={req.make}&model={req.model}&modelYear={req.year}"
        complaints_API_response = requests.get(complaints_URI)
        complaints_json = complaints_API_response.json().get("results", [])

        common_clusters, common_issues_context = _semantic_common_issues(complaints_json)
        clustered_complaint_count = sum(
            1 for c in complaints_json if len((c.get("summary") or "").strip()) >= 20
        )
        concentration_context = _cluster_concentration_flag(common_clusters, clustered_complaint_count)

        recall_context = _top_component_summary(combined_recall_df, component_col="component", top_n=10)
        inv_context = _top_component_summary(df_inv, component_col="component", top_n=10)

        # --- Tiered web search + per-source extraction ---
        # include_raw_content=True: without this, Tavily only returns a short
        # snippet and per-source extraction has nothing substantive to judge.
        # If your langchain_tavily version rejects this kwarg, remove it -- the
        # fallback direct-fetch in _build_doc_from_result still covers you.
        try:
            tavily = TavilySearch(max_results=4, api_key=os.environ["TAVILY_API_KEY"], include_raw_content=True)
        except TypeError:
            tavily = TavilySearch(max_results=4, api_key=os.environ["TAVILY_API_KEY"])

        documents_tavily: list[Document] = _gather_tavily_reliability_docs(req.make, req.model, req.year, tavily)

        llm = ChatGroq(model="openai/gpt-oss-120b")
        web_signal = _build_web_reliability_signal(llm, documents_tavily, req.make, req.model, req.year)
        print(web_signal)

        reliability = _reliability_score(combined_recall_df, df_inv, common_clusters, web_signal, req.year)
        print(reliability)

        question = (
            f"Generate a reliability summary for the make={req.make} model={req.model} "
            f"year={req.year}, using the computed reliability score as your anchor."
        )

        prompt = ChatPromptTemplate.from_template("""
        You are a vehicle reliability analyst. You are given a computed reliability
        score that combines NHTSA recurrence patterns (recalls, investigations,
        clustered owner complaints -- recall/investigation penalties are amplified
        for younger vehicles, since the same count matters more in a short
        ownership history) with a web-reputation signal built primarily from
        TRUSTED sources; community sources like Reddit are supplementary and can
        only nudge, not dominate, the signal.

        Reliability Score: {score}/100 ({tier})
        Score breakdown: {penalty_breakdown}
        Raw counts: {raw_counts}
        Aggregated web reliability signal: {web_signal}

        Write a reliability summary with these sections:
        1. Headline verdict (one or two sentences) stating the score, tier, and what
           that means for a prospective owner.
        2. Most common issues -- from the recurring complaint clusters below.
        3. Recall/investigation patterns -- which components recur in official data,
           and note if the vehicle's young age means these carry extra weight.
        4. Systemic issue check -- from the concentration flag.
        5. Web reputation -- summarize the aggregated web signal. State how many
           trusted (primary) sources contributed vs supplementary/community ones,
           and what that means for confidence in this part of the score.
        6. Data sufficiency note -- if NHTSA data volume is low, say plainly that
           this vehicle doesn't have much official history yet and the score
           leans more on web reputation as a result.
        7. Bottom line -- one paragraph, plain language, for a prospective buyer.

        Be explicit about what's drawn from NHTSA data versus web reputation. Do
        not invent recalls, investigations, or issues not present in the context.

        Recall Context (most common recall components):{recall_context}

        Investigation Context (most common investigation components):{inv_context}

        Most Common Complaint Issues (semantically clustered, ranked by recurrence):{common_issues_context}

        Issue Concentration:{concentration_context}

        Question:{question}

        Answer:
        """)

        chain = prompt | llm

        answer = chain.invoke({
            "score": reliability["score"],
            "tier": reliability["tier"],
            "penalty_breakdown": reliability["penalty_breakdown"],
            "raw_counts": reliability["raw_counts"],
            "web_signal": reliability["web_signal"],
            "recall_context": recall_context,
            "inv_context": inv_context,
            "common_issues_context": common_issues_context,
            "concentration_context": concentration_context,
            "question": question,
        })

        return answer.content

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))