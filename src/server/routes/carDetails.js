import { Router } from 'express';

const router = Router();
const EPA = 'https://www.fueleconomy.gov/ws/rest';

async function epaJson(path) {
  const res = await fetch(`${EPA}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const err = new Error(`Upstream data source error (${res.status})`);
    err.status = 502;
    throw err;
  }
  return res.json();
}

function menuItems(payload) {
  const items = payload?.menuItem;
  if (!items) return [];
  return (Array.isArray(items) ? items : [items]).map((i) => ({ text: i.text, value: i.value }));
}
// epa likes to us -1 for null
function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) || n < 0 ? null : n;
}

function normalizeVehicle(v, variantText) {
  const displ = num(v.displ);
  const cyl = num(v.cylinders);
  return {
    make: v.make || null,
    model: v.model || null,
    year: num(v.year),
    variant: variantText || v.trany || null,
    sizeClass: v.VClass || null,
    engine: {
      displacementL: displ === 0 ? null : displ,
      cylinders: cyl === 0 ? null : cyl,
      transmission: v.trany || null,
      drive: v.drive || null,
      fuelType: v.fuelType || v.fuelType1 || null,
    },
    fuelEfficiency: {
      cityMpg: num(v.city08),
      highwayMpg: num(v.highway08),
      combinedMpg: num(v.comb08),
      annualFuelCostUsd: num(v.fuelCost08),
    },
    // placeholders — not available from the free EPA source
    productionYears: null,
    dimensions: null,
    features: null,
    availability: null,
    price: { msrp: null, currency: 'USD' },
  };
}

const PLACEHOLDER_FIELDS = ['productionYears', 'dimensions', 'features', 'availability', 'price'];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

router.get('/years', async (req, res, next) => {
  try {
    res.json({ items: menuItems(await epaJson('/vehicle/menu/year')) });
  } catch (err) {
    next(err);
  }
});


router.get('/makes', async (req, res, next) => {
  try {
    const { year } = req.query;
    if (!year) throw badRequest("Query param 'year' is required");
    const data = await epaJson(`/vehicle/menu/make?year=${encodeURIComponent(year)}`);
    res.json({ year, items: menuItems(data) });
  } catch (err) {
    next(err);
  }
});


router.get('/models', async (req, res, next) => {
  try {
    const { year, make } = req.query;
    if (!year || !make) throw badRequest("Query params 'year' and 'make' are required");
    const data = await epaJson(
      `/vehicle/menu/model?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`
    );
    res.json({ year, make, items: menuItems(data) });
  } catch (err) {
    next(err);
  }
});


router.get('/options', async (req, res, next) => {
  try {
    const { year, make, model } = req.query;
    if (!year || !make || !model)
      throw badRequest("Query params 'year', 'make' and 'model' are required");
    const data = await epaJson(
      `/vehicle/menu/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(
        make
      )}&model=${encodeURIComponent(model)}`
    );
    res.json({ year, make, model, items: menuItems(data) });
  } catch (err) {
    next(err);
  }
});

// full normalized details
router.get('/', async (req, res, next) => {
  try {
    const { id, variant } = req.query;
    if (!id) throw badRequest("Query param 'id' (EPA vehicle id) is required");

    const raw = await epaJson(`/vehicle/${encodeURIComponent(id)}`);
    if (!raw || (!raw.make && !raw.model)) {
      const err = new Error('No details found for that vehicle. Try another selection.');
      err.status = 404;
      throw err;
    }

    res.json({
      source: ['EPA fueleconomy.gov (U.S. DOE/EPA, public domain)'],
      retrievedAt: new Date().toISOString(),
      placeholders: PLACEHOLDER_FIELDS,
      details: normalizeVehicle(raw, variant),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
