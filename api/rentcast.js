export default async function handler(req, res) {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Missing lat/lng parameters' });
    }
    
    try {
        const response = await fetch(
            `https://api.rentcast.io/v1/avm/value?latitude=${lat}&longitude=${lng}`,
            {
                headers: {
                    'X-API-Key': process.env.RENTCAST_API_KEY,
                    'Accept': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        
        // Set CORS headers so your GitHub Pages or Vercel domain can call it
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(data);
        
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch property data' });
    }
}
