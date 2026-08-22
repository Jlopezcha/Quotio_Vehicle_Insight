import { Router } from 'express';

/**
 * Vehicle safety recalls — NHTSA Recalls API (free, official, no API key).
 * Mounted at /api/recalls.
 *
 *   Menus:   https://api.nhtsa.gov/products/vehicle/{modelYears|makes|models}?issueType=r
 *   Recalls: https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=
 *
 * The menu endpoints return only years/makes/models that ACTUALLY have recall
 * records, so the dropdowns can never produce an empty lookup.
 *
 * Each recall record carries a `Component` string such as
 *   "AIR BAGS:FRONTAL:DRIVER SIDE INFLATOR MODULE"
 * We derive a top-level CATEGORY from the text before the first colon, which
 * lets the UI group and filter recalls by system (air bags, brakes, engine...).
 */

const router = Router();
const NHTSA = 'https://api.nhtsa.gov';
const REQUEST_TIMEOUT_MS = 8000;

async function nhtsaJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(`Upstream data source error (${res.status})`);
      err.status = 502;
      throw err;
    }
    return await res.json();
  } catch (e) {
    if (e.status) throw e;
    const err = new Error('Could not reach the NHTSA recall service. Please try again.');
    err.status = 502;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// NHTSA menu rows use varying key names; pull the first string value present.
function pickValue(row, keys) {
  for (const k of keys) {
    if (row && typeof row[k] === 'string' && row[k].trim()) return row[k].trim();
  }
  return null;
}

function menuList(payload, keys) {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  const values = rows.map((r) => pickValue(r, keys)).filter(Boolean);
  return [...new Set(values)]; // de-duplicate
}

/**
 * Derive top-level categories from a Component string.
 * "AIR BAGS:FRONTAL:DRIVER SIDE" -> ["AIR BAGS"]
 * "ENGINE AND ENGINE COOLING, FUEL SYSTEM" -> ["ENGINE AND ENGINE COOLING", "FUEL SYSTEM"]
 */
function categoriesFrom(component) {
  if (!component || typeof component !== 'string') return ['UNCATEGORIZED'];
  const parts = component
    .split(',')
    .map((chunk) => chunk.split(':')[0].trim().toUpperCase())
    .filter(Boolean);
  return parts.length ? [...new Set(parts)] : ['UNCATEGORIZED'];
}

function normalizeRecall(r) {
  const component = r.Component || null;
  return {
    campaignNumber: r.NHTSACampaignNumber || null,
    manufacturer: r.Manufacturer || null,
    component,
    categories: categoriesFrom(component),
    summary: r.Summary || null,
    consequence: r.Consequence || null,
    remedy: r.Remedy || null,
    notes: r.Notes || null,
    reportReceivedDate: r.ReportReceivedDate || null,
    // NHTSA "do not drive" / "park outside" safety advisories.
    parkIt: r.ParkIt === true || r.ParkIt === 'true',
    parkOutSide: r.ParkOutSide === true || r.ParkOutSide === 'true',
  };
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// GET /api/recalls/years  — model years that have recall data
router.get('/years', async (req, res, next) => {
  try {
    const data = await nhtsaJson(`${NHTSA}/products/vehicle/modelYears?issueType=r`);
    const years = menuList(data, ['modelYear', 'ModelYear']).sort((a, b) => Number(b) - Number(a));
    res.json({ count: years.length, items: years });
  } catch (err) {
    next(err);
  }
});

// GET /api/recalls/makes?year=2021
router.get('/makes', async (req, res, next) => {
  try {
    const { year } = req.query;
    if (!year) throw badRequest("Query param 'year' is required");
    const data = await nhtsaJson(
      `${NHTSA}/products/vehicle/makes?modelYear=${encodeURIComponent(year)}&issueType=r`
    );
    const makes = menuList(data, ['make', 'makeName', 'Make']).sort();
    res.json({ year, count: makes.length, items: makes });
  } catch (err) {
    next(err);
  }
});

// GET /api/recalls/models?year=2021&make=TOYOTA
router.get('/models', async (req, res, next) => {
  try {
    const { year, make } = req.query;
    if (!year || !make) throw badRequest("Query params 'year' and 'make' are required");
    const data = await nhtsaJson(
      `${NHTSA}/products/vehicle/models?modelYear=${encodeURIComponent(
        year
      )}&make=${encodeURIComponent(make)}&issueType=r`
    );
    const models = menuList(data, ['model', 'modelName', 'Model']).sort();
    res.json({ year, make, count: models.length, items: models });
  } catch (err) {
    next(err);
  }
});

// GET /api/recalls?year=2021&make=TOYOTA&model=CAMRY[&category=AIR%20BAGS]
router.get('/', async (req, res, next) => {
  try {
    const { year, make, model, category } = req.query;
    if (!year || !make || !model)
      throw badRequest("Query params 'year', 'make' and 'model' are required");

    const data = await nhtsaJson(
      `${NHTSA}/recalls/recallsByVehicle?make=${encodeURIComponent(
        make
      )}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(year)}`
    );

    const all = (Array.isArray(data?.results) ? data.results : []).map(normalizeRecall);

    // Distinct categories present, with a count for each.
    const counts = new Map();
    for (const rec of all) {
      for (const c of rec.categories) counts.set(c, (counts.get(c) || 0) + 1);
    }
    const categories = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const wanted = category ? String(category).toUpperCase() : null;
    const recalls = wanted ? all.filter((r) => r.categories.includes(wanted)) : all;

    res.json({
      vehicle: { year, make, model },
      source: ['NHTSA Recalls API (U.S. DOT, public domain)'],
      retrievedAt: new Date().toISOString(),
      total: all.length,
      count: recalls.length,
      categories,
      recalls,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
