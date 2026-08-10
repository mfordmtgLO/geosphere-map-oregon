// Vercel serverless function - RentCast API proxy v3
export default async function handler(req, res) {
    const { city, county, state, zipCode, limit } = req.query;
    
    if (!city && !county && !state && !zipCode) {
        return res.status(400).json({ error: 'Missing search parameters.' });
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
        
        // Build address string — RentCast only uses 'address'
        if (city && state) {
            params.append('address', `${city}, ${state}`);
        } else if (county && state) {
            params.append('address', `${county} County, ${state}`);
        } else if (zipCode) {
            params.append('address', zipCode);
        }
        
        const url = `https://api.rentcast.io/v1/listings?${params.toString()}`;
        console.log('Fetching:', url);
        
        const response = await fetch(url, {
            headers: {
                'X-API-Key': process.env.RENTCAST_API_KEY,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
                error: `RentCast API error: ${response.status}`,
                details: errorText
            });
        }
        
        const data = await response.json();
        
        const filtered = Array.isArray(data) ? data.filter(listing => {
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') return false;
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') return false;
            if (listing.propertyType === 'Multi-Family' && listing.units && listing.units >= 5) return false;
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
        return res.status(500).json({ error: 'Failed to fetch property listings' });
    }
}
