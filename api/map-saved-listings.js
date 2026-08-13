import { readSavedListingPulls } from "./saved-listings.js";

/**
 * Map-only cache browser. The public map can browse the same GeoSphere saved
 * snapshots it created, but this route never calls Rentcast or accepts writes.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const pulls = await readSavedListingPulls();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ version: 1, generatedAt: new Date().toISOString(), pulls });
  } catch (error) {
    console.error("Map saved-listing browser failed:", error.message);
    return res.status(500).json({ error: "Unable to read saved listings" });
  }
}
