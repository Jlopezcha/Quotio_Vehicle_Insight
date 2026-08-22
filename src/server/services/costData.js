/**
 
 */

// --- Fuel -------------------------------------------------------------------
// Approximate regular-grade $/gallon, regional snapshot ~June 2026, anchored to
// AAA's national average of $3.86 (via Forbes Advisor, 6/29/2026). Gas prices
// change DAILY and were elevated by the 2026 Middle East conflict, so treat this
// as a dated snapshot — for live values use the EIA API or AAA state averages.
export const NATIONAL_GAS_PRICE = 3.86;

export const stateGasPrice = {
  AL: 3.45, AK: 3.95, AZ: 3.75, AR: 3.40, CA: 4.75, CO: 3.55, CT: 3.60,
  DE: 3.55, FL: 3.65, GA: 3.50, HI: 4.65, ID: 3.80, IL: 3.85, IN: 3.40,
  IA: 3.55, KS: 3.45, KY: 3.45, LA: 3.40, ME: 3.65, MD: 3.65, MA: 3.60,
  MI: 3.70, MN: 3.60, MS: 3.35, MO: 3.35, MT: 3.75, NE: 3.55, NV: 4.15,
  NH: 3.60, NJ: 3.55, NM: 3.60, NY: 3.80, NC: 3.55, ND: 3.60, OH: 3.55,
  OK: 3.35, OR: 4.05, PA: 3.80, RI: 3.60, SC: 3.45, SD: 3.55, TN: 3.40,
  TX: 3.35, UT: 3.75, VT: 3.65, VA: 3.50, WA: 4.55, WV: 3.55, WI: 3.55,
  WY: 3.65, DC: 3.75,
};

// --- Insurance --------------------------------------------------------------
// Average ANNUAL full-coverage premium ($), derived from ValuePenguin's
// state averages (full coverage, updated 7/8/2026) — monthly figures x 12.
// National full-coverage average ~ $208/mo ($2,496/yr).
export const NATIONAL_INSURANCE_ANNUAL = 2496;

export const stateInsuranceAnnual = {
  AL: 2172, AK: 2040, AZ: 2832, AR: 2700, CA: 2652, CO: 3264, CT: 3660,
  DE: 3624, FL: 3732, GA: 2208, HI: 1812, ID: 1776, IL: 2220, IN: 1992,
  IA: 2040, KS: 2700, KY: 2496, LA: 3924, ME: 1548, MD: 2532, MA: 2172,
  MI: 3120, MN: 2664, MS: 2412, MO: 2652, MT: 2532, NE: 2316, NV: 4020,
  NH: 1608, NJ: 2988, NM: 2544, NY: 2712, NC: 1764, ND: 2160, OH: 1776,
  OK: 2568, OR: 2388, PA: 2376, RI: 3312, SC: 2280, SD: 2352, TN: 2112,
  TX: 2964, UT: 2688, VT: 1536, VA: 2028, WA: 2628, WV: 2148, WI: 2016,
  WY: 1572, DC: 2928,
};

// --- Maintenance ------------------------------------------------------------
// AAA "Your Driving Costs" reports combined maintenance/repair/tire cost of
// roughly $0.10/mile for an average vehicle. Replace with the latest figure.
export const MAINTENANCE_PER_MILE = 0.10;

// Older vehicles cost more to maintain. Applied as 1 + (age * rate), capped.
export const MAINTENANCE_AGE_RATE = 0.03; // +3% per year of age
export const MAINTENANCE_AGE_CAP = 2.0; // never more than 2x the base

export const SOURCES = {
  gas: 'AAA national average $3.86/gal (via Forbes Advisor, 6/29/2026); per-state approximate snapshot - use EIA/AAA for live values',
  insurance: 'ValuePenguin state full-coverage averages, updated 7/8/2026 (annual = monthly x 12)',
  maintenance: 'AAA "Your Driving Costs" cost-per-mile (approximate)',
  mpg: 'EPA fueleconomy.gov (live)',
};
