// RENTCAST PROXY V12 - UPSTASH KV CACHE
import { kv } from '@vercel/kv';

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
    
    // Check Upstash KV cache
    try {
        const cached = await kv.get(cacheKey);
        if (cached) {
            console.log('KV HIT:', cacheKey);
            res.setHeader('X-Cache', 'KV-HIT');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).json({
                ...cached,
                fromCache: true
            });
        }
    } catch (e) {
        console.warn('KV read failed, fetching live:', e.message);
    }
    
    console.log('KV MISS:', cacheKey);
    
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
        
        const result = {
            count: filtered.length,
            totalFetched: allListings.length,
            listings: filtered,
            cachedAt: Date.now()
        };
        
        // Store in Upstash KV
        try {
            await kv.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
            console.log('KV stored:', cacheKey);
        } catch (e) {
            console.warn('KV write failed:', e.message);
        }
        
        res.setHeader('X-Cache', 'KV-MISS');
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
