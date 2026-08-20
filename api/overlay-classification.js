import { readFile } from "node:fs/promises";
import path from "node:path";

let overlayIndexPromise;

function parseAssignedJson(source, filename) {
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Unable to parse overlay source: ${filename}`);
  }
  return JSON.parse(source.slice(start, end + 1));
}

async function readAssignedJson(filename) {
  const source = await readFile(path.join(process.cwd(), filename), "utf8");
  return parseAssignedJson(source, filename);
}

export function parseLmiTractLookup(source, filename = "lmi-matched-tracts.js") {
  const tracts = {};
  const matcher = /['"](\d{11})['"]\s*:\s*['"](Low|Moderate)['"]/g;
  let match;

  while ((match = matcher.exec(source))) {
    tracts[match[1]] = match[2];
  }

  if (!Object.keys(tracts).length) {
    throw new Error(`Unable to parse LMI tract lookup: ${filename}`);
  }

  return tracts;
}

async function readLmiTractLookup(filename) {
  const source = await readFile(path.join(process.cwd(), filename), "utf8");
  return parseLmiTractLookup(source, filename);
}

export function parseFirstHomePurchaseLimits(source, filename = "oregon_firsthome_purchase_price_limits.json") {
  let payload;
  try {
    payload = JSON.parse(source);
  } catch {
    throw new Error(`Unable to parse FirstHome purchase limits: ${filename}`);
  }
  if (!Array.isArray(payload?.county_price_limits)) {
    throw new Error(`Missing county_price_limits in ${filename}`);
  }
  const counties = new Map();
  for (const item of payload.county_price_limits) {
    if (!item?.county) continue;
    counties.set(String(item.county).trim().toLowerCase(), {
      county: String(item.county).trim(),
      nonTargetedPriceLimit: item.non_targeted_price_limit_usd !== null && Number.isFinite(Number(item.non_targeted_price_limit_usd)) ? Number(item.non_targeted_price_limit_usd) : null,
      targetedPriceLimit: item.targeted_price_limit_usd !== null && Number.isFinite(Number(item.targeted_price_limit_usd)) ? Number(item.targeted_price_limit_usd) : null,
      targetedAreaDetails: String(item.targeted_area_details ?? ""),
    });
  }
  if (!counties.size) throw new Error(`No county limits found in ${filename}`);
  return { metadata: payload.metadata ?? {}, counties };
}

function normalizeAreaName(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+county$/i, "").replace(/\s+/g, " ");
}

function targetedAreaRules(details) {
  const text = String(details ?? "");
  const entireCounty = /entire county is targeted/i.test(text);
  const citiesMatch = text.match(/within the city limits of\s+([^;]+)/i);
  const cities = citiesMatch ? citiesMatch[1].split(/,|\band\b/i).map(normalizeAreaName).filter(Boolean) : [];
  const tractCodes = new Set(Array.from(text.matchAll(/\b(\d{4}\.\d{2})\b/g), (match) => match[1].replace(".", "")));
  return { entireCounty, cities, tractCodes };
}

function boundsForGeometry(geometry) {
  const bounds = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };
  const visit = (value) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      bounds.minLng = Math.min(bounds.minLng, value[0]);
      bounds.maxLng = Math.max(bounds.maxLng, value[0]);
      bounds.minLat = Math.min(bounds.minLat, value[1]);
      bounds.maxLat = Math.max(bounds.maxLat, value[1]);
      return;
    }
    value.forEach(visit);
  };
  visit(geometry.coordinates);
  return bounds;
}

function pointInRing([lng, lat], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crossesLatitude = (yi > lat) !== (yj > lat);
    const intersectLng = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crossesLatitude && lng < intersectLng) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, rings) {
  if (!rings?.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function makeSpatialEntries(features, getMetadata) {
  return features
    .filter((feature) => feature?.geometry?.coordinates)
    .map((feature) => ({ geometry: feature.geometry, bounds: boundsForGeometry(feature.geometry), ...getMetadata(feature) }));
}

function includesPoint(point, entries, predicate = () => true) {
  const [lng, lat] = point;
  return entries.some((entry) =>
    predicate(entry) &&
    lng >= entry.bounds.minLng &&
    lng <= entry.bounds.maxLng &&
    lat >= entry.bounds.minLat &&
    lat <= entry.bounds.maxLat &&
    pointInGeometry(point, entry.geometry)
  );
}

function findContainingEntry(point, entries, predicate = () => true) {
  const [lng, lat] = point;
  return entries.find((entry) =>
    predicate(entry) &&
    lng >= entry.bounds.minLng &&
    lng <= entry.bounds.maxLng &&
    lat >= entry.bounds.minLat &&
    lat <= entry.bounds.maxLat &&
    pointInGeometry(point, entry.geometry)
  ) ?? null;
}

export function isUsdaEligibleOutsideIneligibleAreas(point, usdaEntries, stateFips) {
  const liesInIneligibleArea = includesPoint(point, usdaEntries, (entry) =>
    entry.stateFips === stateFips || entry.displayStateFips.includes(stateFips)
  );

  return !liesInIneligibleArea;
}

async function loadOverlayIndex() {
  const [tractGeoJson, lmiTracts, usdaGeoJson, firstHomeLimitsSource] = await Promise.all([
    readAssignedJson("oregon-lmi-tracts.js"),
    readLmiTractLookup("lmi-matched-tracts.js"),
    readAssignedJson("usda-rural-development-geojson.js"),
    readFile(path.join(process.cwd(), "oregon_firsthome_purchase_price_limits.json"), "utf8"),
  ]);
  const firstHomeLimits = parseFirstHomePurchaseLimits(firstHomeLimitsSource);

  return {
    lmiEntries: makeSpatialEntries(tractGeoJson.features ?? [], (feature) => ({
      lmiLevel: lmiTracts[feature.properties?.GEOID] ?? null,
      tractCode: String(feature.properties?.TRACTCE ?? ""),
    })).filter((entry) => entry.lmiLevel),
    usdaEntries: makeSpatialEntries(usdaGeoJson.features ?? [], (feature) => ({
      stateFips: feature.properties?.stateFips ?? null,
      displayStateFips: feature.properties?.displayStateFips ?? [],
    })),
    firstHomeLimits,
  };
}

function getOverlayIndex() {
  if (!overlayIndexPromise) overlayIndexPromise = loadOverlayIndex();
  return overlayIndexPromise;
}

const STATE_FIPS = { OR: "41", WA: "53", CA: "06", ID: "16" };

export function getFirstHomeScreening(listing, lmiEntry, firstHomeLimits, stateFips) {
  const countyLimit = stateFips === "41" ? firstHomeLimits.counties.get(normalizeAreaName(listing.county)) : null;
  if (!countyLimit) {
    return { available: false, priceEligible: null, lmiEligible: false, areaType: null, priceLimit: null, county: listing.county ?? null, targetedAreaDetails: null };
  }
  const rules = targetedAreaRules(countyLimit.targetedAreaDetails);
  const cityMatches = rules.cities.includes(normalizeAreaName(listing.city));
  const tractMatches = Boolean(lmiEntry?.tractCode && rules.tractCodes.has(lmiEntry.tractCode));
  const targeted = rules.entireCounty || cityMatches || tractMatches;
  const areaType = targeted ? "targeted" : "non_targeted";
  const priceLimit = targeted ? countyLimit.targetedPriceLimit : countyLimit.nonTargetedPriceLimit;
  const price = Number(listing.price);
  const priceEligible = Number.isFinite(price) && price > 0 && Number.isFinite(priceLimit) ? price <= priceLimit : null;
  return {
    available: Number.isFinite(priceLimit),
    priceEligible,
    lmiEligible: Boolean(lmiEntry) && priceEligible === true,
    areaType,
    priceLimit,
    county: countyLimit.county,
    targetedAreaDetails: countyLimit.targetedAreaDetails,
  };
}

/**
 * Enriches one Rentcast snapshot using the exact LMI and USDA source geometries
 * rendered in GeoSphere. USDA source polygons are ineligible urban/metro areas,
 * so properties outside them are classified as USDA RD eligible. A failure returns
 * safe empty overlays so
 * a manual Rentcast pull is never blocked by the optional map enrichment step.
 */
export async function buildOverlaySets(listings, state) {
  const all = Array.isArray(listings) ? listings : [];
  try {
    const { lmiEntries, usdaEntries, firstHomeLimits } = await getOverlayIndex();
    const stateFips = STATE_FIPS[String(state ?? "OR").toUpperCase()] ?? "41";
    const enriched = all.map((listing) => {
      const longitude = Number(listing.longitude);
      const latitude = Number(listing.latitude);
      const hasCoordinates = Number.isFinite(longitude) && Number.isFinite(latitude);
      const point = [longitude, latitude];
      const lmiEntry = hasCoordinates ? findContainingEntry(point, lmiEntries) : null;
      const lmi = Boolean(lmiEntry);
      const usda = hasCoordinates && isUsdaEligibleOutsideIneligibleAreas(point, usdaEntries, stateFips);
      const firstHome = getFirstHomeScreening(listing, lmiEntry, firstHomeLimits, stateFips);
      return {
        ...listing,
        overlayEligibility: {
          lmi,
          usda,
          usdaInterpretation: "outside-ineligible-v1",
          firstHome,
        },
      };
    });
    return {
      all: enriched,
      lmi: enriched.filter((listing) => listing.overlayEligibility.lmi),
      usda: enriched.filter((listing) => listing.overlayEligibility.usda),
      lmiUsda: enriched.filter((listing) => listing.overlayEligibility.lmi && listing.overlayEligibility.usda),
    };
  } catch (error) {
    console.warn("Overlay classification failed; preserving unclassified saved pull:", error.message);
    return { all, lmi: [], usda: [], lmiUsda: [] };
  }
}
