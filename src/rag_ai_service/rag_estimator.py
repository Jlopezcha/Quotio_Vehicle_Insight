from langchain_core.prompts import ChatPromptTemplate
import pandas as pd
import numpy as np
import math
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

MILEAGE_INTERVALS = [20_000, 40_000, 80_000, 120_000]

client = MongoClient(os.environ["MONGODB_URI"])
db = client["quotio"]
collection_recall_pre2010 = db["recalldatapre2010"]
collection_recall_post2010 = db["recalldatapost2010"]
collection_invdata = db["invdatas"]

# --- Reliability scoring weights (tune against known-good / known-bad vehicles) ---
RECALL_WEIGHT = 1.0
INVESTIGATION_WEIGHT = 2.0
COMPLAINT_WEIGHT = 1.0
SCALE = 60.0  # controls decay speed; log-based penalties are much smaller than raw
              # counts, so this needs to be re-tuned relative to the old linear formula

CONCENTRATION_FLAG_THRESHOLD = 0.4  # if one issue cluster >= 40% of clustered complaints

# --- Semantic clustering config ---
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
SIMILARITY_THRESHOLD = 0.82   # cosine similarity to consider two complaints "the same issue"
NEIGHBOR_SEARCH_K = 8         
MIN_CLUSTER_SIZE = 2          # clusters below this are one-off, not "common" issues
TOP_N_CLUSTERS = 8

_embedding_model = None


class CarRequest(BaseModel):
    make: str = Field(..., examples=["Honda"])
    model: str = Field(..., examples=["Civic"])
    year: int = Field(..., examples=[2016])


def _get_embedding_model() -> HuggingFaceEmbeddings:
    """Lazy-loaded, module-level singleton -- loading the model is the expensive
    part, so we don't want to reload it on every request.
    """
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    return _embedding_model


class _UnionFind:
    """Standard disjoint-set structure used to merge complaints into clusters
    based on pairwise similarity edges.
    """

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
    lines = [f"{comp}: {count} occurrence(s)" for comp, count in counts.items()]
    return "\n".join(lines)




def _semantic_common_issues(complaints_json: list[dict]) -> tuple[list[dict], str]:
    """Embeds complaint summaries, clusters near-duplicate/semantically-similar
    complaints via FAISS + union-find, and returns clusters ranked by size.

    This surfaces recurring real-world issues (e.g. "AC compressor failure")
    even when NHTSA's coarse `components` taxonomy would lump several distinct
    problems under one broad code.
    """
    texts, meta = [], []
    for c in complaints_json:
        summary = (c.get("summary") or "").strip()
        if len(summary) < 20:  # skip empty/near-empty summaries, not useful signal
            continue
        texts.append(summary)
        meta.append(c)

    if len(texts) < 2:
        return [], "Not enough complaint text to detect recurring patterns."

    embedder = _get_embedding_model()
    vectors = np.array(embedder.embed_documents(texts), dtype="float32")
    faiss.normalize_L2(vectors)  # so inner product == cosine similarity

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
        rep_idx = max(idxs, key=lambda i: len(texts[i]))  # longest summary as representative
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



@router.post("/rag-estimate")
async def ragestimate(req: CarRequest):
    try:
        mongo_vehicle_query = {"make": req.make.upper(), "model": req.model.upper(), "year": str(req.year)}

        pre_2010_recall_doc = collection_recall_pre2010.find(mongo_vehicle_query)
        post_2010_recall_doc = collection_recall_post2010.find(mongo_vehicle_query)
        inv_doc = collection_invdata.find(mongo_vehicle_query)

        pre_2010_df = pd.DataFrame(list(pre_2010_recall_doc))
        post_2010_df = pd.DataFrame(list(post_2010_recall_doc))
        df_inv = pd.DataFrame(list(inv_doc))

        print(pre_2010_df)
        print(post_2010_df)
        print("---inv---")
        print(df_inv)

        for df in (pre_2010_df, post_2010_df, df_inv):
            if "_id" in df.columns:
                df.drop(columns=["_id"], inplace=True)

        combined_recall_df = pd.concat([pre_2010_df, post_2010_df], ignore_index=True)

        complaints_URI = f"https://api.nhtsa.gov/complaints/complaintsByVehicle?make={req.make}&model={req.model}&modelYear={req.year}"
        complaints_API_response = requests.get(complaints_URI)
        complaints_json = complaints_API_response.json().get("results", [])
        #print(complaints_json)

        def _gather_tavily_cost_docs(make: str, model: str, year: int, tavily: TavilySearch) -> list[Document]:
            docs: list[Document] = []

            for mileage in MILEAGE_INTERVALS:
                query = f"{year} {make} {model} typical maintenance cost at {mileage} miles service schedule"
                results = tavily.invoke({"query": query})
                for r in results.get("results", [])[:2]:
                    docs.append(
                        Document(
                            page_content=(
                                f"MAINTENANCE COST CONTEXT | Mileage ~{mileage} | "
                                f"{r.get('title', '')}: {r.get('content', '')[:500]}"
                            ),
                            metadata={"type": "maintenance_cost", "mileage": mileage, "source": r.get("url", "")},
                        )
                    )

            reliability_query = f"{year} {make} {model} common problems repair cost transmission engine"
            reliability_results = tavily.invoke({"query": reliability_query})
            for r in reliability_results.get("results", [])[:3]:
                docs.append(
                    Document(
                        page_content=f"KNOWN ISSUE CONTEXT | {r.get('title', '')}: {r.get('content', '')[:500]}",
                        metadata={"type": "known_issue", "source": r.get("url", "")},
                    )
                )

            return docs

        tavily = TavilySearch(max_results=4, api_key=os.environ["TAVILY_API_KEY"])
        documents_tavily: list[Document] = _gather_tavily_cost_docs(req.make, req.model, req.year, tavily)

        common_clusters, common_issues_context = _semantic_common_issues(complaints_json)
        print("=======Common issues===========")
        print(common_issues_context)

        clustered_complaint_count = sum(
            1 for c in complaints_json if len((c.get("summary") or "").strip()) >= 20
        )
        concentration_context = _cluster_concentration_flag(common_clusters, clustered_complaint_count)
        print("=======Concentration issues ===========")
        print(concentration_context)

        recall_context = _top_component_summary(combined_recall_df, component_col="component", top_n=10)
        print("=====Recall Context=====")
        print(recall_context)
        inv_context = _top_component_summary(df_inv, component_col="component", top_n=10)
        print("=========INV Context=======")
        print(inv_context)

        llm = ChatGroq(model="llama-3.3-70b-versatile")

        question = f"Generate the mileage-interval maintenance and cost estimate for the make={req.make} model={req.model} year={req.year}"

        prompt = ChatPromptTemplate.from_template("""
        You are a vehicle maintenance cost estimator. You are given
        retrieved context about a specific vehicle: NHTSA recall records, NHTSA owner
        complaint records, and web search snippets
        about typical maintenance costs.

        For each interval in {intervals}:
        - Routine maintenance expected at that mileage (e.g. oil change, brake pads,
        timing belt, transmission fluid) and an estimated cost range.
        - Any recalls or recurring owner complaints from the context relevant to that
        mileage/age, with estimated repair cost range if repairs would be out-of-warranty.

        Finish with a short summary table: mileage | routine maintenance cost |
        running total.

        Be explicit when a figure is an estimate rather than a value pulled directly
        from source data. Keep dollar figures realistic and consistent across
        intervals (costs should scale sensibly, not jump arbitrarily).

        Use the following sections to answer the question

        Recall Context (most common recall components):{recall_context}

        Investigation Context (most common investigation components):{inv_context}

        Most Common Complaint Issues (semantically clustered, ranked by recurrence):{common_issues_context}

        Issue Concentration:{concentration_context}

        Online Data Context:{online_context}

        Question:{question}

        Answer:
        """)

        chain = prompt | llm

        answer = chain.invoke({
            "intervals": f"{MILEAGE_INTERVALS}",
            "recall_context": f"{recall_context}",
            "inv_context": f"{inv_context}",
            "common_issues_context": common_issues_context,
            "concentration_context": concentration_context,
            "online_context": f"{documents_tavily}",
            "question": f"{question}"
        })

        print(answer.content)
        return answer.content

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))