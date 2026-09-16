// RENTCAST PROXY V14 - LIVE PULL + 500 LIMIT + 50 PULL BILLING CYCLE HARD STOP
import { kv } from '@vercel/kv';
import { buildOverlaySets, buildProgramReviewSets } from './overlay-classification.js';
import { getProgramReviewConfiguration } from './program-review-config.js';

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const MAX_MONTHLY_PULLS = 50;
const BILLING_RESET_DAY = 6; // RentCast billing cycle renews on the 6th

// Calculates the billing cycle key: e.g. "rentcast:usage:2026-09"
function getCurrentBillingCycleKey() {
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1; // 1-12
    const day = now.getUTCDate();

    // If today is before the 6th, this billing cycle started on the 6th of the previous month
    if (day < BILLING_RESET_DAY) {
        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }
    }
    const mm = String(month).padStart(2, '0');
    return `rentcast:usage:${year}-${mm}`;
}

function getCacheKey(params) {
    return 'listings:' + [params.city, params.county, params.zipCode, params.state]
        .filter(Boolean)
        .join(':')
        .toLowerCase()
        .replace(/\s+/g, '-');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const billingKey = getCurrentBillingCycleKey();

    // Action 1: Get current usage count
    if (req.query.action === 'get_usage') {
        let count = 0;
        try {
            count = (await kv.get(billingKey)) || 0;
        } catch (e) {
            console.warn('KV get usage failed:', e.message);
        }
        return res.status(200).json({
            count: Number(count),
            maxPulls: MAX_MONTHLY_PULLS,
            billingCycle: billingKey,
            hardStopped: Number(count) >= MAX_MONTHLY_PULLS
        });
    }

    // Action 2: Admin manual reset
    if (req.query.action === 'reset_usage' || req.method === 'POST') {
        try {
            await kv.set(billingKey, 0);
            return res.status(200).json({ success: true, count: 0, billingCycle: billingKey });
        } catch (e) {
            return res.status(500).json({ error: 'Failed to reset usage in KV: ' + e.message });
        }
    }

    const { city, county, state, zipCode } = req.query;
    if (!city && !county && !state && !zipCode) {
        return res.status(400).json({ error: 'Missing search parameters.' });
    }

    // --- SERVER-SIDE HARD STOP CHECK ---
    let currentUsage = 0;
    try {
        currentUsage = Number((await kv.get(billingKey)) || 0);
    } catch (e) {
        console.warn('KV read failed during limit check:', e.message);
    }

    if (currentUsage >= MAX_MONTHLY_PULLS) {
        return res.status(429).json({
            error: `RentCast monthly quota hard stop active (${currentUsage}/${MAX_MONTHLY_PULLS}). Resets on the 6th.`,
            hardStopped: true,
            currentUsage,
            maxPulls: MAX_MONTHLY_PULLS
        });
    }

    const cacheKey = getCacheKey({ city, county, zipCode, state });
    console.log('LIVE REFRESH:', cacheKey, 'Current billing usage:', currentUsage);

    try {
        // --- 500 LISTINGS PER PAGE OPTIMIZATION ---
        const PAGE_LIMIT = 500;
        const baseParams = new URLSearchParams({
            limit: PAGE_LIMIT.toString(),
            status: 'Active'
        });

        if (city) baseParams.append('city', city);
        if (county) baseParams.append('county', county);
        if (state) baseParams.append('state', state);
        if (zipCode) baseParams.append('zipCode', zipCode);

        let allListings = [];
        let offset = 0;
        let hasMore = true;
        const maxPages = 2; // Maximum 2 pages (up to 1,000 listings) to prevent runaway calls
        let apiPullsUsedThisSearch = 0;

        while (hasMore && offset < maxPages * PAGE_LIMIT) {
            // Check hard stop before each network call
            if (currentUsage + apiPullsUsedThisSearch >= MAX_MONTHLY_PULLS) {
                break;
            }

            const params = new URLSearchParams(baseParams.toString());
            params.append('offset', offset.toString());

            const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'X-API-Key': process.env.RENTCAST_API_KEY,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) break;

            apiPullsUsedThisSearch++;
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                hasMore = false;
            } else {
                allListings = allListings.concat(data);
                offset += PAGE_LIMIT;
                if (data.length < PAGE_LIMIT) hasMore = false;
            }
        }

        // Atomically increment KV usage by the actual number of RentCast HTTP calls made
        let updatedUsage = currentUsage;
        if (apiPullsUsedThisSearch > 0) {
            try {
                updatedUsage = await kv.incrby(billingKey, apiPullsUsedThisSearch);
            } catch (e) {
                console.warn('KV increment failed:', e.message);
                updatedUsage += apiPullsUsedThisSearch;
            }
        }

        const filtered = allListings.filter(listing => {
            // 1. PRICE CAP: Minimum $250k, Maximum $800k
            if (!listing.price || listing.price < 250000 || listing.price > 800000) return false;
            // 2. EXCLUDED PROPERTY TYPES
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') return false;
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') return false;
            if ((listing.propertyType === 'Multi-Family' || listing.propertyType === 'Multi Family') && Number(listing.units ?? listing.unitCount ?? listing.numberOfUnits) > 4) return false;
            // 3. SIZE & ACREAGE FILTERS
            if (listing.squareFootage && listing.squareFootage < 850) return false;
            if (listing.lotSize && listing.lotSize > 435600) return false;
            // 4. MANUFACTURED HOME CONSTRAINTS
            const isManufactured = listing.propertyType === 'Manufactured' ||
                                   listing.propertyType === 'Mobile/Manufactured' ||
                                   (typeof listing.propertyType === 'string' && listing.propertyType.toLowerCase().includes('manufactured'));
            if (isManufactured) {
                if (listing.landLease === true) return false;
                if (!listing.yearBuilt || listing.yearBuilt < 1995) return false;
            }
            return true;
        });

        const savedAt = Date.now();
        const overlaySets = await buildOverlaySets(filtered, state);
        const programReviewSets = buildProgramReviewSets(overlaySets.all);
        const result = {
            version: 2,
            snapshotId: `${cacheKey}:${savedAt}`,
            areaKey: cacheKey,
            area: { city: city ?? null, county: county ?? null, zipCode: zipCode ?? null, state: state ?? null },
            count: overlaySets.all.length,
            totalFetched: allListings.length,
            listings: overlaySets.all,
            overlaySets,
            programReviewSets,
            programReviewConfiguration: getProgramReviewConfiguration(),
            savedAt,
            cachedAt: savedAt,
            billingUsage: updatedUsage,
            maxPulls: MAX_MONTHLY_PULLS
        };

        // Store snapshot in Upstash KV
        try {
            await kv.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
            console.log('KV stored snapshot:', cacheKey);
        } catch (e) {
            console.warn('KV write failed:', e.message);
        }

        res.setHeader('X-Cache', 'LIVE-REFRESH');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            ...result,
            fromCache: false
        });

    } catch (error) {
        console.error('Function error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch property listings' });
    }
}
