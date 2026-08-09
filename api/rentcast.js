// Vercel serverless function - RentCast API proxy v2
export default async function handler(req, res) {
    const { city, county, state, zipCode, limit } = req.query;
    
    // Validate at least one search parameter
    if (!city && !county && !state && !zipCode) {
        return res.status(400).json({ error: 'Missing search parameters. Provide city, county, state, or zipCode.' });
    }
    
    try {
        const params = new URLSearchParams({
            propertyType: 'Single Family',
            limit: limit || '50',
            minPrice: '250000',
            maxPrice: '800000',
            bedroomsMin: '1',
            status: 'Active'
        });
        
        // Add location filters
        if (city) params.append('city', city);
        if (county) params.append('county', county);
        if (state) params.append('state', state);
        if (zipCode) params.append('zipCode', zipCode);
        
        const response = await fetch(
            `https://api.rentcast.io/v1/listings?${params.toString()}`,
            {
                headers: {
                    'X-API-Key': process.env.RENTCAST_API_KEY,
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('RentCast API Error:', response.status, errorText);
            return res.status(response.status).json({ error: `RentCast API error: ${response.status}` });
        }
        
        const data = await response.json();
        
        // Filter out unwanted property types
        const filtered = Array.isArray(data) ? data.filter(listing => {
            // Exclude bare land
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') return false;
            
            // Exclude commercial/industrial
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') return false;
            
            // Exclude 5+ unit multi-family (considered commercial mortgage)
            if (listing.propertyType === 'Multi-Family' && listing.units && listing.units >= 5) return false;
            
            // Exclude manufactured/mobile homes on leased land
            if ((listing.propertyType === 'Manufactured' || listing.propertyType === 'Mobile/Manufactured') 
                && listing.landLease === true) return false;
            
            return true;
        }) : [];
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            count: filtered.length,
            searchParams: { city, county, state, zipCode },
            listings: filtered
        });
        
    } catch (error) {
        console.error('RentCast Listings Error:', error);
        return res.status(500).json({ error: 'Failed to fetch property listings' });
    }
}
