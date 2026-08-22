import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageLayout from "./PageLayout";

import { useEffect, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Monthly vehicle cost estimator.
 *
 * Combines two sources of truth:
 *   1. /api/estimate            — deterministic fuel/insurance/maintenance
 *                                 breakdown from EPA MPG, EIA gas prices and
 *                                 published state insurance averages.
 *   2. /api/rag-mileage-estimator — the RAG/LLaMA narrative explanation.
 *
 * Both are requested in parallel. If either fails the page still renders the
 * other, so one service being down never blanks the result.
 */

const us_states_options = [
  "Alabama (AL)", "Alaska (AK)", "Arizona (AZ)", "Arkansas (AR)", "California (CA)",
  "Colorado (CO)", "Connecticut (CT)", "Delaware (DE)", "Florida (FL)", "Georgia (GA)",
  "Hawaii (HI)", "Idaho (ID)", "Illinois (IL)", "Indiana (IN)", "Iowa (IA)",
  "Kansas (KS)", "Kentucky (KY)", "Louisiana (LA)", "Maine (ME)", "Maryland (MD)",
  "Massachusetts (MA)", "Michigan (MI)", "Minnesota (MN)", "Mississippi (MS)", "Missouri (MO)",
  "Montana (MT)", "Nebraska (NE)", "Nevada (NV)", "New Hampshire (NH)", "New Jersey (NJ)",
  "New Mexico (NM)", "New York (NY)", "North Carolina (NC)", "North Dakota (ND)", "Ohio (OH)",
  "Oklahoma (OK)", "Oregon (OR)", "Pennsylvania (PA)", "Rhode Island (RI)", "South Carolina (SC)",
  "South Dakota (SD)", "Tennessee (TN)", "Texas (TX)", "Utah (UT)", "Vermont (VT)",
  "Virginia (VA)", "Washington (WA)", "West Virginia (WV)", "Wisconsin (WI)", "Wyoming (WY)",
];

const money = (n) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// The RAG endpoint may return a bare string or an object wrapping one.
function ragText(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.response || payload.text || payload.message || payload.result || "";
}

function MonthlyCost() {
  const [selectedState, setSelectedState] = useState("");
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [avgWeeklyMiles, setAvgWeeklyMiles] = useState("");

  const [result, setResult] = useState(null);      // formula breakdown
  const [ragResponse, setRagResponse] = useState(""); // AI narrative
  const [isFormComplete, setFormComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ragLoading, setRagLoading] = useState(false); // rag loading, tracked separately
  const [error, setError] = useState("");

  const loadMenu = (url) =>
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((d) => (d.items || []).map((i) => i.text));

  // Years on mount.
  useEffect(() => {
    loadMenu("/api/car-details/years")
      .then(setYears)
      .catch(() =>
        setError("Couldn't reach the data service. Is the API server running on port 3000?")
      );
  }, []);

  // Makes when year changes.
  useEffect(() => {
    setMakes([]); setMake(""); setModels([]); setSelectedModel("");
    if (!year) return;
    loadMenu(`/api/car-details/makes?year=${encodeURIComponent(year)}`)
      .then(setMakes)
      .catch(() => {});
  }, [year]);

  // Models when make changes.
  useEffect(() => {
    setModels([]); setSelectedModel("");
    if (!year || !make) return;
    loadMenu(
      `/api/car-details/models?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`
    )
      .then(setModels)
      .catch(() => {});
  }, [make]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRagLoading(true);
    setError("");
    setResult(null);
    setRagResponse("");

    // Deterministic breakdown.
    const estimatePromise = fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: selectedState,
        year,
        make,
        model: selectedModel,
        weeklyMiles: avgWeeklyMiles,
      }),
    }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Estimate failed");
      return body;
    });

    // RAG narrative (same request contract the RAG route already expects).
    const ragPromise = fetch("/api/rag-mileage-estimator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make,
        model: selectedModel,
        year,
      }),
    }).then((res) => res.json());

    const markComplete = () => setFormComplete(true);

    estimatePromise
      .then((data) => {
        setResult(data);
        markComplete();
      })
      .catch((err) => setError(err.message || "Could not generate an estimate"))
      .finally(() => setLoading(false));

    ragPromise
      .then((data) => {
        setRagResponse(ragText(data));
        markComplete();
      })
      .catch(() => {})
      .then(() => setRagLoading(false))

    Promise.allSettled([estimatePromise, ragPromise]).then(([est, rag]) => {
      if(est.status === 'rejected' && rag.status === 'rejected'){
        setError("Could not generate an estimate")
      }
    });
  };

  const reset = () => {
    setResult(null);
    setRagResponse("");
    setFormComplete(false);
    setError("");
  };

  return (
    <PageLayout>
      <div className="mb-10">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Monthly Cost Calculator
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Fill out the form to receive an estimate of fuel, insurance,
          and maintenance costs. An AI RAG based summary regarding maintenance costs at different mileage intervals will be provided below.
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/70 shadow-sm shadow-black/20">
        {loading ? (
          <div className="p-6 sm:p-8">
            <p className="text-muted-foreground">Loading estimate...</p>
          </div>
        ) : !isFormComplete ? (
          <form className="space-y-4 p-6 sm:p-8" onSubmit={handleSubmit}>
                  <Combobox
                    items={us_states_options}
                    value={selectedState}
                    onValueChange={setSelectedState}
                  >
                    <ComboboxInput placeholder="Select state" className="h-11 w-full" required={true} />
                    <ComboboxContent>
                      <ComboboxEmpty>No items found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (<ComboboxItem key={item} value={item}>{item}</ComboboxItem>)}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>

                  <Combobox items={years} value={year} onValueChange={setYear}>
                    <ComboboxInput placeholder="Select year" className="h-11 w-full" required={true} />
                    <ComboboxContent>
                      <ComboboxEmpty>No items found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (<ComboboxItem key={item} value={item}>{item}</ComboboxItem>)}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>

                  {year && (
                    <Combobox items={makes} value={make} onValueChange={setMake}>
                      <ComboboxInput placeholder="Select make" className="h-11 w-full" required={true} />
                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (<ComboboxItem key={item} value={item}>{item}</ComboboxItem>)}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}

                  {make && (
                    <Combobox items={models} value={selectedModel} onValueChange={setSelectedModel}>
                      <ComboboxInput placeholder="Select model" className="h-11 w-full" required={true} />
                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (<ComboboxItem key={item} value={item}>{item}</ComboboxItem>)}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}

                  <Input
                    type="number"
                    placeholder="Enter avg miles driven weekly"
                    className="h-11 w-full"
                    required={true}
                    value={avgWeeklyMiles}
                    onChange={(e) => setAvgWeeklyMiles(e.target.value)}
                  />

                  {error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button type="submit" size="lg">
                    Submit
                  </Button>
          </form>
        ) : (
          <Results result={result} ragResponse={ragResponse} ragLoading={ragLoading} onReset={reset} />
        )}
      </div>
    </PageLayout>
  );
}

function Results({ result, ragResponse, ragLoading, onReset }) {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      {result ? <Breakdown result={result} /> : null}

      {ragLoading ? (
        <div className="p-6 sm:p-8">
            <p className="text-muted-foreground">Loading RAG response...</p>
        </div>
      ) : ragResponse ? (
        <div className={result ? "rounded-xl border border-border/60 bg-card/80 p-5" : ""}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            AI analysis maintenance mileage intervals 
          </p>
          <div className="prose prose-invert max-w-none text-card-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{ragResponse}</ReactMarkdown>
          </div>
        </div>
      ) : null}

      {!result && !ragLoading && !ragResponse ? (
        <p className="rounded-md border border-border/60 bg-card/80 p-4 text-muted-foreground">
          No estimate could be generated for this vehicle.
        </p>
      ) : null}

      <Button size="lg" onClick={onReset}>
        Estimate another
      </Button>
    </div>
  );
}

function Breakdown({ result }) {
  const { monthly, assumptions, vehicle, sources } = result;
  const rows = [
    ["Fuel", monthly.fuel],
    ["Insurance", monthly.insurance],
    ["Maintenance", monthly.maintenance],
  ];
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-5">
      <p className="text-sm text-muted-foreground">
        {vehicle?.year} {vehicle?.make} {vehicle?.model} · {assumptions.stateCode} ·{" "}
        {assumptions.weeklyMiles} mi/week
      </p>
      <p className="mt-1 text-4xl font-bold tracking-tight">
        {money(monthly.total)}
        <span className="text-lg font-normal text-muted-foreground"> /month</span>
      </p>

      <dl className="mt-6 max-w-md space-y-2">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-baseline justify-between border-b border-border/50 pb-2">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{money(val)}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        Based on {assumptions.mpg} mpg (EPA) and {money(assumptions.gasPricePerGallon)}/gal.
        {sources?.gas ? ` Fuel price: ${sources.gas}.` : ""}
        {sources?.insurance ? ` Insurance: ${sources.insurance}.` : ""}
        {" "}Estimate only — not a quote.
      </p>
    </div>
  );
}

export default MonthlyCost;
