// RENTCAST PROXY V8 - PAGINATED RESULTS
export default async function handler(req, res) {
    const { city, county, state, zipCode, limit } = req.query;
    
    if (!city && !county && !state && !zipCode) {
        return res.status(400).json({ error: 'Missing search parameters.' });
    }
    
    try {
        const baseParams = new URLSearchParams({
            limit: '50',
            status: 'Active',
            minPrice: '250000',
            maxPrice: '800000'
        });
        
        if (city) baseParams.append('city', city);
        if (county) baseParams.append('county', county);
        if (state) baseParams.append('state', state);
        if (zipCode) baseParams.append('zipCode', zipCode);
        
        let allListings = [];
        let offset = 0;
        let hasMore = true;
        const maxPages = 10; // Fetch up to 500 results (10 pages x 50)
        
        while (hasMore && offset < maxPages * 50) {
            const params = new URLSearchParams(baseParams.toString());
            params.append('offset', offset.toString());
            
            const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;
            console.log(`Fetching page ${offset / 50 + 1}:`, url);
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': process.env.RENTCAST_API_KEY,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('RentCast error:', response.status);
                break;
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data) || data.length === 0) {
                hasMore = false;
            } else {
                allListings = allListings.concat(data);
                offset += 50;
                
                // If we got fewer than 50, we've reached the end
                if (data.length < 50) hasMore = false;
            }
        }
        
        console.log(`Total fetched: ${allListings.length} listings`);
        
        // Client-side filter
        const filtered = allListings.filter(listing => {
            // Price check
            if (!listing.price || listing.price < 250000 || listing.price > 800000) return false;
            
            // Exclude bare land
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') return false;
            
            // Exclude commercial/industrial
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') return false;
            
            // Exclude 5+ unit multi-family
            if (listing.propertyType === 'Multi-Family' && listing.units && listing.units >= 5) return false;
            
            // Exclude manufactured on leased land
            if ((listing.propertyType === 'Manufactured' || listing.propertyType === 'Mobile/Manufactured') 
                && listing.landLease === true) return false;
            
            // Exclude 0 bedroom listings
            if (listing.bedrooms === 0) return false;
            
            return true;
        });
        
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
