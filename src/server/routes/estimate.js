import { Router } from 'express';
import { buildEstimate } from '../services/estimateService.js';
import { getGasPrice } from '../services/gasPriceService.js';
/**
 * post structure
 * 
 * 
 * POST /api/estimate
 * Body: { state, year, make, model, weeklyMiles }
 *   state       e.g. "Florida (FL)" or "FL"
 *   year, make, model  as chosen from the EPA-backed selectors
 *   weeklyMiles number
 *
 * Resolves the vehicle's EPA combined MPG (averaged across the model's trims),
 * then returns a monthly fuel / maintenance / insurance breakdown.
 */

const router = Router();
const EPA = 'https://www.fueleconomy.gov/ws/rest';
const MAX_TRIMS = 5; // cap EPA calls per estimate

async function epaJson(path) {
  const res = await fetch(`${EPA}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const err = new Error(`Upstream data source error (${res.status})`);
    err.status = 502;
    throw err;
  }
  return res.json();
}

function menuValues(payload) {
  const items = payload?.menuItem;
  if (!items) return [];
  return (Array.isArray(items) ? items : [items]).map((i) => i.value);
}

function stateCodeFrom(state) {
  if (!state) return null;
  const paren = String(state).match(/\(([A-Za-z]{2})\)/); // "Florida (FL)"
  if (paren) return paren[1].toUpperCase();
  if (/^[A-Za-z]{2}$/.test(state)) return state.toUpperCase(); // already "FL"
  return null;
}

// Average EPA combined MPG across a model's trims (ignoring missing values).
async function resolveMpg(year, make, model) {
  const ids = menuValues(
    await epaJson(
      `/vehicle/menu/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(
        make
      )}&model=${encodeURIComponent(model)}`
    )
  ).slice(0, MAX_TRIMS);

  if (ids.length === 0) return null;

  const vehicles = await Promise.all(
    ids.map((id) => epaJson(`/vehicle/${encodeURIComponent(id)}`).catch(() => null))
  );

  const mpgs = vehicles
    .map((v) => Number(v?.comb08))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (mpgs.length === 0) return null;
  return mpgs.reduce((a, b) => a + b, 0) / mpgs.length;
}

router.post('/', async (req, res, next) => {
  try {
    const { state, year, make, model, weeklyMiles } = req.body || {};

    const stateCode = stateCodeFrom(state);
    const miles = Number(weeklyMiles);

    if (!stateCode) throw badRequest("A valid 'state' is required");
    if (!year || !make || !model) throw badRequest("'year', 'make' and 'model' are required");
    if (!Number.isFinite(miles) || miles <= 0)
      throw badRequest("'weeklyMiles' must be a positive number");

    const mpg = await resolveMpg(year, make, model);
    if (!mpg) {
      const err = new Error(
        'Could not find EPA fuel economy for that vehicle. Try another model or year.'
      );
      err.status = 422;
      throw err;
    }

    // Live retail gas price from EIA (falls back to the static table).
    const gas = await getGasPrice(stateCode);

    const estimate = buildEstimate({
      stateCode,
      weeklyMiles: miles,
      mpg: Math.round(mpg * 10) / 10,
      vehicleYear: year,
      gasPricePerGallon: gas.pricePerGallon,
      gasPriceSource: gas.source,
    });

    res.json({ vehicle: { year, make, model }, ...estimate });
  } catch (err) {
    next(err);
  }
});

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

export default router;
