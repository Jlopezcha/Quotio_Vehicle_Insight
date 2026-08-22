import { Button } from "@/components/ui/button";
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

import { AlertTriangle, ShieldCheck, Wrench, CircleAlert } from "lucide-react";

function Recall() {
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const [result, setResult] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMenu = (url) =>
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((d) => d.items || []);

  // Years on mount.
  useEffect(() => {
    loadMenu("/api/recalls/years")
      .then(setYears)
      .catch(() =>
        setError("Couldn't reach the recall service. Is the API server running on port 3000?")
      );
  }, []);

  // Makes when year changes.
  useEffect(() => {
    setMakes([]); setMake(""); setModels([]); setModel("");
    if (!year) return;
    loadMenu(`/api/recalls/makes?year=${encodeURIComponent(year)}`).then(setMakes).catch(() => {});
  }, [year]);

  // Models when make changes.
  useEffect(() => {
    setModels([]); setModel("");
    if (!year || !make) return;
    loadMenu(`/api/recalls/models?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`)
      .then(setModels)
      .catch(() => {});
  }, [make]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setActiveCategory(null);
    try {
      const res = await fetch(
        `/api/recalls?year=${encodeURIComponent(year)}&make=${encodeURIComponent(
          make
        )}&model=${encodeURIComponent(model)}`
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Recall lookup failed");
      setResult(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setActiveCategory(null);
    setError("");
  };

  const visible = result
    ? activeCategory
      ? result.recalls.filter((r) => r.categories.includes(activeCategory))
      : result.recalls
    : [];

  return (
    <PageLayout>
      <div className="mb-10">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Vehicle Recalls
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Select your vehicle to review open safety recalls grouped by affected system.
        </p>
      </div>

      {!result ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/70 bg-card/70 p-6 shadow-sm shadow-black/20">
            <h2 className="text-2xl font-bold text-card-foreground">Lookup Details</h2>
            <p className="mt-2 text-muted-foreground">
              Provide year, make, and model to check active NHTSA recall bulletins.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/70 shadow-sm shadow-black/20">
            <form className="space-y-4 p-6 sm:p-8" onSubmit={handleSubmit}>
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
                  <Combobox items={models} value={model} onValueChange={setModel}>
                    <ComboboxInput placeholder="Select model" className="h-11 w-full" required={true} />
                    <ComboboxContent>
                      <ComboboxEmpty>No items found.</ComboboxEmpty>
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

                <Button type="submit" size="lg" disabled={loading || !model}>
                  {loading ? "Searching…" : "Check recalls"}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Data source: National Highway Traffic Safety Administration.
                </p>
              </form>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card/70 p-6 shadow-sm shadow-black/20 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {result.vehicle.year} {result.vehicle.make} {result.vehicle.model}
              </p>
              <p className="text-2xl font-semibold text-card-foreground">
                {result.total === 0
                  ? "No open recalls found"
                  : `${result.total} recall${result.total === 1 ? "" : "s"}`}
              </p>
            </div>
            <Button size="lg" onClick={reset}>Check another vehicle</Button>
          </div>

          {result.total === 0 ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-5 text-card-foreground">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                NHTSA lists no open safety recalls for this vehicle. Recalls are added over
                time, so it is worth checking again periodically.
              </p>
            </div>
          ) : (
            <>
              {/* Category filter */}
              <div className="mt-6 flex flex-wrap gap-2">
                <CategoryChip
                  label={`All (${result.total})`}
                  active={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                />
                {result.categories.map((c) => (
                  <CategoryChip
                    key={c.name}
                    label={`${titleCase(c.name)} (${c.count})`}
                    active={activeCategory === c.name}
                    onClick={() => setActiveCategory(c.name)}
                  />
                ))}
              </div>

              <div className="mt-6 space-y-4">
                {visible.map((r, i) => (
                  <RecallCard key={r.campaignNumber || i} recall={r} />
                ))}
              </div>
            </>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Source: {result.source?.join(", ")} · Retrieved{" "}
            {new Date(result.retrievedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </PageLayout>
  );
}

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border border-border/70 px-3 py-1.5 text-xs transition-colors ${
        active
          ? "bg-secondary text-secondary-foreground"
          : "bg-background/50 text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function RecallCard({ recall }) {
  return (
    <article className="rounded-xl border border-border/60 bg-card/80 p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {recall.categories.map(titleCase).join(" · ")}
          </p>
          <h3 className="mt-1 font-semibold leading-tight">{recall.component}</h3>
        </div>
        <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      {(recall.parkIt || recall.parkOutSide) && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {recall.parkIt ? "Do not drive until repaired." : "Park outside away from structures."}
        </div>
      )}

      {recall.consequence && (
        <Field label="Risk" text={recall.consequence} />
      )}
      {recall.summary && <Field label="Summary" text={recall.summary} />}
      {recall.remedy && <Field label="Remedy" text={recall.remedy} icon={Wrench} />}

      <p className="mt-4 text-xs text-muted-foreground">
        {recall.campaignNumber ? `Campaign ${recall.campaignNumber}` : null}
        {recall.manufacturer ? ` · ${recall.manufacturer}` : null}
        {recall.reportReceivedDate ? ` · Reported ${recall.reportReceivedDate}` : null}
      </p>
    </article>
  );
}

function Field({ label, text, icon: Icon }) {
  return (
    <div className="mt-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function titleCase(s) {
  return String(s)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default Recall;
