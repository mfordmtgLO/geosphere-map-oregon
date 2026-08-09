export default async function handler(req, res) {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Missing lat/lng parameters' });
    }
    
    try {
        // Build the listings endpoint with all property filters
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lng,
            radius: '5',                    // 5-mile search radius
            propertyType: 'Single Family',  // Residential stick-built
            limit: '25',                    // Max results per call
            minPrice: '250000',
            maxPrice: '800000',
            bedroomsMin: '1',
            status: 'Active'               // Only active listings
        });
        
        const response = await fetch(
            `https://api.rentcast.io/v1/listings?${params.toString()}`,
            {
                headers: {
                    'X-API-Key': process.env.RENTCAST_API_KEY,
                    'Accept': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        
        // Filter out commercial, multi-family (5+ units), bare land, and leased land
        const filtered = Array.isArray(data) ? data.filter(listing => {
            // Exclude bare land
            if (listing.propertyType === 'Land' || listing.propertyType === 'Lots/Land') {
                return false;
            }
            
            // Exclude commercial
            if (listing.propertyType === 'Commercial' || listing.propertyType === 'Industrial') {
                return false;
            }
            
            // Exclude multi-family 5+ units (mortgage = commercial)
            if (listing.propertyType === 'Multi-Family' && listing.units && listing.units >= 5) {
                return false;
            }
            
            // Exclude manufactured/mobile homes on leased land
            if ((listing.propertyType === 'Manufactured' || listing.propertyType === 'Mobile/Manufactured') 
                && listing.landLease === true) {
                return false;
            }
            
            // Exclude condos/townhouses? Keep them — they're residential
            return true;
        }) : [];
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
            count: filtered.length,
            listings: filtered
        });
        
    } catch (error) {
        console.error('RentCast Listings Error:', error);
        return res.status(500).json({ error: 'Failed to fetch property listings' });
    }
}
