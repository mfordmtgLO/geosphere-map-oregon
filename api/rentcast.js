// RENTCAST PROXY V13 - LIVE PULL + SAVED SNAPSHOT EXPORT
import { kv } from '@vercel/kv';
import { buildOverlaySets } from './overlay-classification.js';

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getCacheKey(params) {
    return 'listings:' + [params.city, params.county, params.zipCode, params.state]
        .filter(Boolean)
        .join(':')
        .toLowerCase()
        .replace(/\s+/g, '-');
}

export default async function handler(req, res) {
    const { city, county, state, zipCode } = req.query;
    
    if (!city && !county && !state && !zipCode) {
        return res.status(400).json({ error: 'Missing search parameters.' });
    }
    
    const cacheKey = getCacheKey({ city, county, zipCode, state });
    
    // This endpoint powers GeoSphere's Live Pull mode. It intentionally does
    // not read KV first: every invocation refreshes Rentcast and replaces the
    // saved snapshot for the area. Cache-only browsing remains in Saved Listings.
    console.log('LIVE REFRESH:', cacheKey);
    
    try {
        const baseParams = new URLSearchParams({
            limit: '50',
            status: 'Active'
        });
        
        if (city) baseParams.append('city', city);
        if (county) baseParams.append('county', county);
        if (state) baseParams.append('state', state);
        if (zipCode) baseParams.append('zipCode', zipCode);
        
        let allListings = [];
        let offset = 0;
        let hasMore = true;
        const maxPages = 10;
        
        while (hasMore && offset < maxPages * 50) {
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
            
            const data = await response.json();
            
            if (!Array.isArray(data) || data.length === 0) {
                hasMore = false;
            } else {
                allListings = allListings.concat(data);
                offset += 50;
                if (data.length < 50) hasMore = false;
            }
        }
        
        const filtered = allListings.filter(listing => {
            if (!listing.price || listing.price < 250000 || listing.price > 800000) return false;
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') return false;
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') return false;
            if (listing.propertyType === 'Multi-Family') return false;
            if ((listing.propertyType === 'Manufactured' || listing.propertyType === 'Mobile/Manufactured') 
                && listing.landLease === true) return false;
            return true;
        });
        
        const savedAt = Date.now();
        const overlaySets = await buildOverlaySets(filtered, state);
        const result = {
            version: 2,
            snapshotId: `${cacheKey}:${savedAt}`,
            areaKey: cacheKey,
            area: { city: city ?? null, county: county ?? null, zipCode: zipCode ?? null, state: state ?? null },
            count: overlaySets.all.length,
            totalFetched: allListings.length,
            listings: overlaySets.all,
            overlaySets,
            savedAt,
            cachedAt: savedAt
        };
        
        // Store in Upstash KV
        try {
            await kv.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
            console.log('KV stored:', cacheKey);
        } catch (e) {
            console.warn('KV write failed:', e.message);
        }
        
        res.setHeader('X-Cache', 'LIVE-REFRESH');
        res.setHeader('Access-Control-Allow-Origin', '*');
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
