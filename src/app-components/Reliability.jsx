import { Button } from "@/components/ui/button";
import PageLayout from "./PageLayout";

import { useEffect, useMemo, useState } from "react";

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


// The RAG endpoint may return a bare string or an object wrapping one.
function ragText(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.response || payload.text || payload.message || payload.result || "";
}


const MAKE_MIN_YEAR = {
  genesis: 2016,
  kia: 1994,
  ram: 2010,
  tesla: 2008,
};

function isMakeAvailable(make, year) {
  const minYear = MAKE_MIN_YEAR[String(make).toLowerCase()];
  if (!minYear) return true; // no known restriction, assume always available
  if (!year) return true;
  return Number(year) >= minYear;
}

function Reliability() {

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const [result, setResult] = useState(null);
  const [ragResponse, setRagResponse] = useState(""); // AI narrative
  const [isFormComplete, setFormComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ragLoading, setRagLoading] = useState(false); // rag loading, tracked separately
  const [error, setError] = useState("");

  const years = Array.from(
    { length: 2026 - 1990 + 1 },
    (_, i) => String(2026 - i)
  );

  useEffect(() => {
    async function loadMakes() {
      try {
        const res = await fetch("/api/cars/makes");
        if (!res.ok) throw new Error("Failed to load makes");
        const makeData = await res.json();
        setMakes(makeData);
      }
      catch (err) {
        console.error(err);
      }
    }
    loadMakes();
  }, []);

  // Makes filtered down to whatever was actually available for the chosen year.
  const availableMakes = useMemo(() => {
    if (!year) return makes;
    return makes.filter((m) => isMakeAvailable(m, year));
  }, [makes, year]);

  // If the year changes and the currently selected make is no longer valid
  // for that year, clear it (and the dependent model) out.
  useEffect(() => {
    if (make && !isMakeAvailable(make, year)) {
      setMake("");
      setSelectedModel("");
      setModels([]);
    }
  }, [year, make]);

  // Fetch models from NHTSA whenever both make and year are selected.
  useEffect(() => {
    if (!make || !year) {
      setModels([]);
      return;
    }

    let cancelled = false;

    async function loadModels() {
      setModelsLoading(true);
      setSelectedModel("");
      try {
        const res = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(
            String(make).toLowerCase()
          )}/modelyear/${encodeURIComponent(year)}?format=json`
        );

        if (!res.ok) throw new Error("Failed to load models");

        const data = await res.json();
        const modelNames = Array.from(
          new Set(
            (data.Results || [])
              .map((r) => r.Model_Name)
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));

        if (!cancelled) setModels(modelNames);
      } catch (err) {
        console.error(err);
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    }

    loadModels();

    return () => {
      cancelled = true;
    };
  }, [make, year]);

  const handleYearChange = (value) => {
    setYear(value);
    setMake("");
    setSelectedModel("");
    setModels([]);
  };

  const handleMakeChange = (value) => {
    setMake(value);
    setSelectedModel("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    //setLoading(true);
    setRagLoading(true);
    setError("");
    setRagResponse("");
    //setResult(true)
    setFormComplete(true);


    const getRatingPromise = fetch(`https://problemsbyvin.com/embed/reliability/${year}-${String(make).toLowerCase()}-${String(selectedModel).toLowerCase()}/`)
      .then((res) => res.ok)
      .catch(() => false);


    // RAG narrative (same request contract the RAG route already expects).
    const ragPromise = fetch("/api/rag-reliability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make,
        model: selectedModel,
        year,
      }),
    }).then((res) => res.json());

    const markComplete = () => setFormComplete(true);

    getRatingPromise
      .then((available) => {
        setResult(available);
        markComplete();
      })
      .finally(() => setLoading(false));


    ragPromise
      .then((data) => {
        setRagResponse(ragText(data));
        markComplete();
      })
      .catch(() => { })
      .then(() => setRagLoading(false))


    Promise.allSettled([getRatingPromise, ragPromise]).then(([rating, rag]) => {
      if (rating.status === 'rejected' && rag.status === 'rejected') {
        setError("Could not generate an estimate")
      }
    });

  };

  const reset = () => {

    setRagResponse("");
    setFormComplete(false);
    setError("");
  };

  return (
    <PageLayout>
      <div className="mb-10">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Reliability
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Fill out the form to receive an AI RAG based summary on a vehicle's reliability.
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/70 shadow-sm shadow-black/20">
        {loading ? (
          <div className="p-6 sm:p-8">
            <p className="text-muted-foreground">Loading estimate...</p>
          </div>
        ) : !isFormComplete ? (
          <form className="space-y-4 p-6 sm:p-8" onSubmit={handleSubmit}>
            <Combobox items={years} value={year} onValueChange={handleYearChange}>
              <ComboboxInput placeholder="Select year" className="h-11 w-full" required={true} />
              <ComboboxContent>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (<ComboboxItem key={item} value={item}>{item}</ComboboxItem>)}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>

            {year && (
              <Combobox items={availableMakes} value={make} onValueChange={handleMakeChange}>
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
              <Combobox
                items={models}
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <ComboboxInput
                  placeholder={modelsLoading ? "Loading models..." : "Select model"}
                  className="h-11 w-full"
                  required={true}
                  disabled={modelsLoading}
                />
                <ComboboxContent>
                  <ComboboxEmpty>
                    {modelsLoading ? "Loading models..." : "No items found."}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (<ComboboxItem key={item} value={item}>{item}</ComboboxItem>)}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}


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
          <Results year={year} make={make} selectedModel={selectedModel} result={result} ragResponse={ragResponse} ragLoading={ragLoading} onReset={reset} />
        )}
      </div>
    </PageLayout>
  );
}

function Results({ year, make, selectedModel, result, ragResponse, ragLoading, onReset }) {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      {result ? <div>
        <iframe src={`https://problemsbyvin.com/embed/reliability/${year}-${String(make).toLowerCase()}-${String(selectedModel).toLowerCase()}/`} width="100%" height="340" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", maxWidth: "640px" }} title={`${year} ${make} ${selectedModel} reliability snapshot`} loading="lazy"></iframe>
        <p style={{ font: "12px/1.5 system-ui,sans-serif", color: "#64748b", maxWidth: "640px", margin: "6px 0 0" }}>Source: <a href={`https://problemsbyvin.com/${year}-${String(make).toLowerCase()}-${String(selectedModel).toLowerCase()}/`} style={{ color: "#b8540a", fontWeight: "600" }}>{year} {make} {selectedModel} reliability snapshot — ProblemsByVin</a></p>
      </div> : null}

      {ragLoading ? (
        <div className="p-6 sm:p-8">
          <p className="text-muted-foreground">Loading RAG response...</p>
        </div>
      ) : ragResponse ? (
        <div className={result ? "rounded-xl border border-border/60 bg-card/80 p-5" : ""}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            AI analysis reliability report
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



export default Reliability;