// RENTCAST PROXY V7 - BROADER FILTERS
export default async function handler(req, res) {
    const { city, county, state, zipCode, limit } = req.query;
    
    if (!city && !county && !state && !zipCode) {
        return res.status(400).json({ error: 'Missing search parameters.' });
    }
    
    try {
        const params = new URLSearchParams({
            limit: limit || '50',
            status: 'Active'
        });
        
        if (city) params.append('city', city);
        if (county) params.append('county', county);
        if (state) params.append('state', state);
        if (zipCode) params.append('zipCode', zipCode);
        
        const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;
        console.log('Fetching:', url);
        
        const response = await fetch(url, {
            headers: {
                'X-API-Key': process.env.RENTCAST_API_KEY,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('RentCast error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `RentCast API error: ${response.status}`,
                details: errorText.substring(0, 200)
            });
        }
        
        const data = await response.json();
        
        const filtered = Array.isArray(data) ? data.filter(listing => {
            // Price filter
            if (listing.price < 250000 || listing.price > 800000) return false;
            
            // Exclude bare land
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') return false;
            
            // Exclude commercial/industrial
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') return false;
            
            // Exclude 5+ unit multi-family
            if (listing.propertyType === 'Multi-Family' && listing.units && listing.units >= 5) return false;
            
            // Exclude manufactured on leased land
            if ((listing.propertyType === 'Manufactured' || listing.propertyType === 'Mobile/Manufactured') 
                && listing.landLease === true) return false;
            
            return true;
        }) : [];
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            count: filtered.length,
            listings: filtered
        });
        
    } catch (error) {
        console.error('Function error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch property listings' });
    }
}
