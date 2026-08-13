import { timingSafeEqual } from "node:crypto";
import { kv } from "@vercel/kv";

const CACHE_KEY_PREFIX = "listings:";
const MAX_SCAN_PAGES = 100;
const SCAN_COUNT = 100;

function sendJson(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
}

function tokenMatches(provided, expected) {
  if (!provided || !expected) return false;
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function areaFromCacheKey(cacheKey) {
  const segments = cacheKey.slice(CACHE_KEY_PREFIX.length).split(":");
  return { label: segments.filter(Boolean).join(" · "), cacheKey };
}

function normalizeSnapshot(cacheKey, raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.listings)) return null;
  const all = raw.overlaySets?.all ?? raw.listings;
  return {
    snapshotId: raw.snapshotId ?? `${cacheKey}:${raw.savedAt ?? raw.cachedAt ?? 0}`,
    cacheKey,
    area: raw.area ?? areaFromCacheKey(cacheKey),
    savedAt: raw.savedAt ?? raw.cachedAt ?? null,
    count: raw.count ?? all.length,
    totalFetched: raw.totalFetched ?? all.length,
    overlaySets: {
      all,
      lmi: raw.overlaySets?.lmi ?? [],
      usda: raw.overlaySets?.usda ?? [],
      lmiUsda: raw.overlaySets?.lmiUsda ?? [],
    },
  };
}

async function listSnapshotKeys() {
  const keys = [];
  let cursor = "0";
  for (let page = 0; page < MAX_SCAN_PAGES; page++) {
    const [nextCursor, batch] = await kv.scan(cursor, { match: `${CACHE_KEY_PREFIX}*`, count: SCAN_COUNT });
    keys.push(...batch);
    cursor = String(nextCursor);
    if (cursor === "0") break;
  }
  return [...new Set(keys)];
}

async function readSnapshots(keys) {
  const snapshots = [];
  for (let index = 0; index < keys.length; index += SCAN_COUNT) {
    const chunk = keys.slice(index, index + SCAN_COUNT);
    const values = await kv.mget(...chunk);
    values.forEach((value, valueIndex) => {
      const snapshot = normalizeSnapshot(chunk[valueIndex], value);
      if (snapshot) snapshots.push(snapshot);
    });
  }
  return snapshots.sort((a, b) => Number(b.savedAt ?? 0) - Number(a.savedAt ?? 0));
}

/** Shared cache-only reader for the protected dashboard export and the map UI. */
export async function readSavedListingPulls() {
  const keys = await listSnapshotKeys();
  return readSnapshots(keys);
}

/**
 * Server-to-server export of cache-only Rentcast snapshots. It never calls
 * Rentcast. Consumers must provide the shared GEOSPHERE_SYNC_TOKEN header.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  if (!tokenMatches(req.headers["x-geosphere-sync-token"], process.env.GEOSPHERE_SYNC_TOKEN)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    const pulls = await readSavedListingPulls();
    return sendJson(res, 200, {
      version: 1,
      generatedAt: new Date().toISOString(),
      pulls,
    });
  } catch (error) {
    console.error("Saved listing export failed:", error.message);
    return sendJson(res, 500, { error: "Unable to export saved listings" });
  }
}
