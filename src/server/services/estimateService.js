import {
  NATIONAL_GAS_PRICE,
  stateGasPrice,
  NATIONAL_INSURANCE_ANNUAL,
  stateInsuranceAnnual,
  MAINTENANCE_PER_MILE,
  MAINTENANCE_AGE_RATE,
  MAINTENANCE_AGE_CAP,
  SOURCES,
} from './costData.js';

/**
 * Pure monthly-cost estimator. No I/O — takes resolved inputs and returns a
 * breakdown. This is the formula-based implementation; a future RAG/LLaMA
 * pipeline can replace the internals of buildEstimate() without changing the
 * route or the UI, as long as it returns the same shape.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const milesPerMonth = (weeklyMiles) => (weeklyMiles * 52) / 12;

export function monthlyFuelCost({ weeklyMiles, mpg, gasPricePerGallon }) {
  if (!mpg || mpg <= 0) return 0;
  return (milesPerMonth(weeklyMiles) / mpg) * gasPricePerGallon;
}

export function monthlyMaintenanceCost({ weeklyMiles, vehicleYear, currentYear }) {
  const age = Math.max(0, currentYear - Number(vehicleYear || currentYear));
  const ageFactor = Math.min(1 + age * MAINTENANCE_AGE_RATE, MAINTENANCE_AGE_CAP);
  return milesPerMonth(weeklyMiles) * MAINTENANCE_PER_MILE * ageFactor;
}

export function monthlyInsuranceCost({ stateCode }) {
  const annual = stateInsuranceAnnual[stateCode] ?? NATIONAL_INSURANCE_ANNUAL;
  return annual / 12;
}

/**
 * Assemble the full estimate.
 * @param {object} p
 * @param {string} p.stateCode   two-letter state code (e.g. "FL")
 * @param {number} p.weeklyMiles
 * @param {number} p.mpg          EPA combined MPG (resolved upstream)
 * @param {number} p.vehicleYear
 * @param {number} [p.gasPricePerGallon]  live price; falls back to the table
 * @param {string} [p.gasPriceSource]     provenance label for the price used
 * @param {number} [p.currentYear]
 */
export function buildEstimate({
  stateCode,
  weeklyMiles,
  mpg,
  vehicleYear,
  gasPricePerGallon,
  gasPriceSource,
  currentYear,
}) {
  const year = currentYear || new Date().getFullYear();
  const gasPrice =
    Number.isFinite(gasPricePerGallon) && gasPricePerGallon > 0
      ? gasPricePerGallon
      : stateGasPrice[stateCode] ?? NATIONAL_GAS_PRICE;

  const fuel = monthlyFuelCost({ weeklyMiles, mpg, gasPricePerGallon: gasPrice });
  const maintenance = monthlyMaintenanceCost({ weeklyMiles, vehicleYear, currentYear: year });
  const insurance = monthlyInsuranceCost({ stateCode });
  const total = fuel + maintenance + insurance;

  return {
    monthly: {
      fuel: round2(fuel),
      maintenance: round2(maintenance),
      insurance: round2(insurance),
      total: round2(total),
    },
    assumptions: {
      stateCode,
      weeklyMiles: Number(weeklyMiles),
      milesPerMonth: round2(milesPerMonth(weeklyMiles)),
      mpg: mpg ?? null,
      gasPricePerGallon: round2(gasPrice),
      vehicleYear: Number(vehicleYear) || null,
    },
    sources: { ...SOURCES, ...(gasPriceSource ? { gas: gasPriceSource } : {}) },
    method: 'formula', // becomes 'rag' when the LLaMA pipeline is wired in
  };
}
