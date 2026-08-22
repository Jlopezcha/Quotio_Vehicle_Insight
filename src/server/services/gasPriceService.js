import { stateGasPrice, NATIONAL_GAS_PRICE } from './costData.js';

/**
 * Live retail gasoline prices from the U.S. Energy Information Administration
 * (EIA) Open Data API v2 — free, official, requires a free API key.
 *   Get a key: https://www.eia.gov/opendata/register.php
 *   Set EIA_API_KEY in .env
 *
 * COVERAGE NOTE: EIA publishes weekly retail gasoline prices for only 9 states
 * (CA, CO, FL, MA, MN, NY, OH, TX, WA), plus PADD regions, sub-regions, cities
 * and the national average — not all 50 states. So we resolve in this order:
 *   1. the state's own EIA series, if EIA covers it
 *   2. the state's PADD region series (live, regional granularity)
 *   3. the static snapshot table in costData.js (offline fallback)
 *
 * Results are cached in memory so we don't re-hit EIA on every estimate
 * (EIA data updates weekly, so a long TTL is appropriate).
 */

const EIA_BASE = 'https://api.eia.gov/v2/petroleum/pri/gnd/data/';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const REQUEST_TIMEOUT_MS = 6000;

// EIA "duoarea" codes for the 9 states EIA covers directly.
const STATE_AREA = {
  CA: 'SCA', CO: 'SCO', FL: 'SFL', MA: 'SMA', MN: 'SMN',
  NY: 'SNY', OH: 'SOH', TX: 'STX', WA: 'SWA',
};

// PADD sub-region / region duoarea codes.
const AREA = {
  NEW_ENGLAND: 'R1X',   // PADD 1A
  CENTRAL_ATL: 'R1Y',   // PADD 1B
  LOWER_ATL: 'R1Z',     // PADD 1C
  MIDWEST: 'R20',       // PADD 2
  GULF: 'R30',          // PADD 3
  ROCKY: 'R40',         // PADD 4
  WEST: 'R50',          // PADD 5
  NATIONAL: 'NUS',
};

// Every state mapped to its PADD region, used when EIA has no state series.
const STATE_REGION = {
  CT: AREA.NEW_ENGLAND, ME: AREA.NEW_ENGLAND, MA: AREA.NEW_ENGLAND,
  NH: AREA.NEW_ENGLAND, RI: AREA.NEW_ENGLAND, VT: AREA.NEW_ENGLAND,

  DE: AREA.CENTRAL_ATL, DC: AREA.CENTRAL_ATL, MD: AREA.CENTRAL_ATL,
  NJ: AREA.CENTRAL_ATL, NY: AREA.CENTRAL_ATL, PA: AREA.CENTRAL_ATL,

  FL: AREA.LOWER_ATL, GA: AREA.LOWER_ATL, NC: AREA.LOWER_ATL,
  SC: AREA.LOWER_ATL, VA: AREA.LOWER_ATL, WV: AREA.LOWER_ATL,

  IL: AREA.MIDWEST, IN: AREA.MIDWEST, IA: AREA.MIDWEST, KS: AREA.MIDWEST,
  KY: AREA.MIDWEST, MI: AREA.MIDWEST, MN: AREA.MIDWEST, MO: AREA.MIDWEST,
  NE: AREA.MIDWEST, ND: AREA.MIDWEST, OH: AREA.MIDWEST, OK: AREA.MIDWEST,
  SD: AREA.MIDWEST, TN: AREA.MIDWEST, WI: AREA.MIDWEST,

  AL: AREA.GULF, AR: AREA.GULF, LA: AREA.GULF, MS: AREA.GULF,
  NM: AREA.GULF, TX: AREA.GULF,

  CO: AREA.ROCKY, ID: AREA.ROCKY, MT: AREA.ROCKY, UT: AREA.ROCKY, WY: AREA.ROCKY,

  AK: AREA.WEST, AZ: AREA.WEST, CA: AREA.WEST, HI: AREA.WEST,
  NV: AREA.WEST, OR: AREA.WEST, WA: AREA.WEST,
};

const cache = new Map(); // duoarea -> { price, fetchedAt, period }

async function fetchArea(duoarea, apiKey) {
  const cached = cache.get(duoarea);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;

  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: 'weekly',
    'data[0]': 'value',
    'facets[duoarea][]': duoarea,
    'facets[product][]': 'EPMR', // regular grade, all formulations
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '1',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${EIA_BASE}?${params}`, { signal: controller.signal });
    if (!res.ok) return null;

    const json = await res.json();
    const row = json?.response?.data?.[0];
    const price = Number(row?.value);
    if (!Number.isFinite(price) || price <= 0) return null;

    const entry = { price, period: row.period, fetchedAt: Date.now() };
    cache.set(duoarea, entry);
    return entry;
  } catch {
    return null; // network error, timeout, or bad payload — caller falls back
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a gallon price for a state.
 * @returns {Promise<{ pricePerGallon:number, source:string, period?:string, live:boolean }>}
 */
export async function getGasPrice(stateCode) {
  const apiKey = process.env.EIA_API_KEY;

  if (apiKey) {
    // 1. State-level series, if EIA covers this state.
    const stateArea = STATE_AREA[stateCode];
    if (stateArea) {
      const hit = await fetchArea(stateArea, apiKey);
      if (hit) {
        return {
          pricePerGallon: hit.price,
          source: `EIA weekly retail price, ${stateCode} (week of ${hit.period})`,
          period: hit.period,
          live: true,
        };
      }
    }

    // 2. Regional series covering this state.
    const regionArea = STATE_REGION[stateCode] || AREA.NATIONAL;
    const regionHit = await fetchArea(regionArea, apiKey);
    if (regionHit) {
      return {
        pricePerGallon: regionHit.price,
        source: `EIA weekly retail price, regional (week of ${regionHit.period})`,
        period: regionHit.period,
        live: true,
      };
    }
  }

  // 3. Offline fallback: static snapshot.
  return {
    pricePerGallon: stateGasPrice[stateCode] ?? NATIONAL_GAS_PRICE,
    source: apiKey
      ? 'Static snapshot (EIA unavailable)'
      : 'Static snapshot (set EIA_API_KEY for live prices)',
    live: false,
  };
}

export const _internals = { STATE_AREA, STATE_REGION, AREA };
