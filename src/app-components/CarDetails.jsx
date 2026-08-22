import { useEffect, useState } from "react";
import { Car as CarIcon, Gauge, Cog, Ruler, ListChecks, MapPin, Tag } from "lucide-react";
import PageLayout from "./PageLayout";


function CarDetails({ embedded = false }) {
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [trimId, setTrimId] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

   const loadMenu = (url) =>
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((d) => d.items || []);

  useEffect(() => {
    loadMenu("/api/car-details/years")
      .then(setYears)
      .catch(() =>
        setError("Couldn't reach the data service. Is the API server running on port 3000?")
      );
  }, []);

  useEffect(() => {
    setMakes([]); setModels([]); setTrims([]);
    setMake(""); setModel(""); setTrimId(""); setResult(null);
    if (!year) return;
    loadMenu(`/api/car-details/makes?year=${encodeURIComponent(year)}`).then(setMakes).catch(() => {});
  }, [year]);

  useEffect(() => {
    setModels([]); setTrims([]); setModel(""); setTrimId(""); setResult(null);
    if (!year || !make) return;
    loadMenu(`/api/car-details/models?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`)
      .then(setModels)
      .catch(() => {});
  }, [make]);

  useEffect(() => {
    setTrims([]); setTrimId(""); setResult(null);
    if (!year || !make || !model) return;
    loadMenu(
      `/api/car-details/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(
        make
      )}&model=${encodeURIComponent(model)}`
    )
      .then(setTrims)
      .catch(() => {});
  }, [model]);

  useEffect(() => {
    if (!trimId) { setResult(null); return; }
    const variant = trims.find((t) => String(t.value) === String(trimId))?.text || "";
    setLoading(true);
    setError("");
    fetch(`/api/car-details?id=${encodeURIComponent(trimId)}&variant=${encodeURIComponent(variant)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Lookup failed");
        return body;
      })
      .then(setResult)
      .catch((err) => { setError(err.message); setResult(null); })
      .finally(() => setLoading(false));
  }, [trimId]);

  const d = result?.details;
  const sectionClass = "";
  const containerClass = "rounded-xl border border-border/70 bg-card/75 p-6 shadow-sm shadow-black/20 sm:p-8";
  const headingClass = embedded
    ? "text-3xl font-bold tracking-tight sm:text-4xl"
    : "text-4xl font-bold tracking-tight sm:text-5xl";
  const introClass = embedded ? "mt-3 text-base text-muted-foreground" : "mt-4 text-lg text-muted-foreground";

  const content = (
    <section className={sectionClass}>
      <div className={containerClass}>
        <h2 className={headingClass}>Car details lookup</h2>
        <p className={introClass}>
          Select a vehicle to retrieve verified specifications from the EPA fuel economy database.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Year" value={year} onChange={setYear} options={years} placeholder="Select year" />
          <Select label="Make" value={make} onChange={setMake} options={makes} placeholder="Select make" disabled={!year} />
          <Select label="Model" value={model} onChange={setModel} options={models} placeholder="Select model" disabled={!make} />
          <Select label="Trim" value={trimId} onChange={setTrimId} options={trims} placeholder="Select trim" disabled={!model} />
        </div>

        {loading && <p className="mt-10 text-muted-foreground">Loading details…</p>}

        {error && !loading && (
          <div className="mt-10 rounded-md border border-destructive/40 p-4 text-destructive">{error}</div>
        )}

        {!loading && !error && !d && (
          <p className="mt-10 text-muted-foreground">
            Choose a year, make, model and trim above to see full specifications.
          </p>
        )}

        {!loading && d && (
          <div className="mt-10 overflow-hidden rounded-2xl border bg-card text-card-foreground">
            <div className="flex items-start justify-between gap-4 border-b p-6">
              <div>
                <p className="text-sm text-muted-foreground">{d.year} {d.make}</p>
                <h3 className="text-2xl font-semibold">{d.model}</h3>
                {d.variant && <p className="mt-1 text-sm text-muted-foreground">{d.variant}</p>}
                {d.sizeClass && <p className="mt-1 text-xs text-muted-foreground">{d.sizeClass}</p>}
              </div>
              <CarIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <Group icon={Cog} title="Engine & drivetrain">
                <Row label="Displacement" value={d.engine.displacementL ? `${d.engine.displacementL} L` : null} />
                <Row label="Cylinders" value={d.engine.cylinders} />
                <Row label="Transmission" value={d.engine.transmission} />
                <Row label="Drive" value={d.engine.drive} />
                <Row label="Fuel type" value={d.engine.fuelType} />
              </Group>

              <Group icon={Gauge} title="Fuel efficiency">
                <Row label="City" value={d.fuelEfficiency.cityMpg ? `${d.fuelEfficiency.cityMpg} mpg` : null} />
                <Row label="Highway" value={d.fuelEfficiency.highwayMpg ? `${d.fuelEfficiency.highwayMpg} mpg` : null} />
                <Row label="Combined" value={d.fuelEfficiency.combinedMpg ? `${d.fuelEfficiency.combinedMpg} mpg` : null} />
                <Row label="Est. annual fuel cost" value={d.fuelEfficiency.annualFuelCostUsd ? `$${d.fuelEfficiency.annualFuelCostUsd.toLocaleString()}` : null} />
              </Group>

              <Group icon={Ruler} title="Dimensions"><Pending /></Group>
              <Group icon={ListChecks} title="Features"><Pending /></Group>
              <Group icon={MapPin} title="Availability"><Pending /></Group>
              <Group icon={Tag} title="Price"><Pending label="MSRP" /></Group>
            </div>

            {result?.source && (
              <p className="border-t px-6 py-4 text-xs text-muted-foreground">
                Source: {result.source.join(", ")} · Retrieved {new Date(result.retrievedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );

  if (embedded) {
    return content;
  }

  return <PageLayout>{content}</PageLayout>;
}

function Select({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-md border bg-card px-3 text-foreground disabled:opacity-40"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.text}</option>
        ))}
      </select>
    </label>
  );
}

function Group({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </div>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">
        {value === null || value === undefined || value === ""
          ? <span className="text-muted-foreground">—</span>
          : value}
      </dd>
    </div>
  );
}

function Pending({ label }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2">
      <dt className="text-sm text-muted-foreground">{label || "Details"}</dt>
      <dd className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
        Pending — not in EPA source
      </dd>
    </div>
  );
}

export default CarDetails;