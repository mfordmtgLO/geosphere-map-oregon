// RENTCAST PROXY V9 - MAX RESULTS
export default async function handler(req, res) {
    const { city, county, state, zipCode } = req.query;
    
    if (!city && !county && !state && !zipCode) {
        return res.status(400).json({ error: 'Missing search parameters.' });
    }
    
    try {
        const baseParams = new URLSearchParams({
            limit: '50',
            status: 'Active'
            // No minPrice/maxPrice here — we filter client-side for accuracy
        });
        
        if (city) baseParams.append('city', city);
        if (county) baseParams.append('county', county);
        if (state) baseParams.append('state', state);
        if (zipCode) baseParams.append('zipCode', zipCode);
        
        let allListings = [];
        let offset = 0;
        let hasMore = true;
        const maxPages = 10; // 500 results max per RentCast docs
        
        while (hasMore && offset < maxPages * 50) {
            const params = new URLSearchParams(baseParams.toString());
            params.append('offset', offset.toString());
            
            const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;
            console.log(`Fetching page ${offset / 50 + 1}...`);
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': process.env.RENTCAST_API_KEY,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error('RentCast error:', response.status);
                break;
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data) || data.length === 0) {
                hasMore = false;
            } else {
                allListings = allListings.concat(data);
                offset += 50;
                if (data.length < 50) hasMore = false;
            }
        }
        
        console.log(`Raw fetched: ${allListings.length}`);
        
        // Precise client-side filter matching your Zillow settings
        const filtered = allListings.filter(listing => {
            // Price: $250K-$800K
            if (!listing.price || listing.price < 250000 || listing.price > 800000) return false;
            
            // Exclude: Land, Lots
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') return false;
            
            // Exclude: Commercial, Industrial
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') return false;
            
            // Exclude: Multi-Family (any units — matching your Zillow filter "no multi-family")
            if (listing.propertyType === 'Multi-Family') return false;
            
            // Exclude: Manufactured on leased land only
            if ((listing.propertyType === 'Manufactured' || listing.propertyType === 'Mobile/Manufactured') 
                && listing.landLease === true) return false;
            
            // Include: Single Family, Condo, Townhouse, Manufactured (not on leased land)
            return true;
        });
        
        console.log(`After filter: ${filtered.length}`);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            count: filtered.length,
            totalFetched: allListings.length,
            listings: filtered
        });
        
    } catch (error) {
        console.error('Function error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch property listings' });
    }
}
