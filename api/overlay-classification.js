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

async function loadOverlayIndex() {
  const [tractGeoJson, lmiTracts, usdaGeoJson] = await Promise.all([
    readAssignedJson("oregon-lmi-tracts.js"),
    readLmiTractLookup("lmi-matched-tracts.js"),
    readAssignedJson("usda-rural-development-geojson.js"),
  ]);

  return {
    lmiEntries: makeSpatialEntries(tractGeoJson.features ?? [], (feature) => ({
      lmiLevel: lmiTracts[feature.properties?.GEOID] ?? null,
    })).filter((entry) => entry.lmiLevel),
    usdaEntries: makeSpatialEntries(usdaGeoJson.features ?? [], (feature) => ({
      stateFips: feature.properties?.stateFips ?? null,
      displayStateFips: feature.properties?.displayStateFips ?? [],
    })),
  };
}

function getOverlayIndex() {
  if (!overlayIndexPromise) overlayIndexPromise = loadOverlayIndex();
  return overlayIndexPromise;
}

const STATE_FIPS = { OR: "41", WA: "53", CA: "06", ID: "16" };

/**
 * Enriches one Rentcast snapshot using the exact LMI and USDA source geometries
 * rendered in GeoSphere. A classification failure returns safe empty overlays so
 * a manual Rentcast pull is never blocked by the optional map enrichment step.
 */
export async function buildOverlaySets(listings, state) {
  const all = Array.isArray(listings) ? listings : [];
  try {
    const { lmiEntries, usdaEntries } = await getOverlayIndex();
    const stateFips = STATE_FIPS[String(state ?? "OR").toUpperCase()] ?? "41";
    const enriched = all.map((listing) => {
      const longitude = Number(listing.longitude);
      const latitude = Number(listing.latitude);
      const hasCoordinates = Number.isFinite(longitude) && Number.isFinite(latitude);
      const point = [longitude, latitude];
      const lmi = hasCoordinates && includesPoint(point, lmiEntries);
      const usda = hasCoordinates && includesPoint(point, usdaEntries, (entry) =>
        entry.stateFips === stateFips || entry.displayStateFips.includes(stateFips)
      );
      return { ...listing, overlayEligibility: { lmi, usda } };
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
