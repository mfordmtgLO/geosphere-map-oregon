export default async function handler(req, res) {
    try {
        const response = await fetch(
            'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/2/query?where=STATE=%2741%27&outFields=GEOID&outSR=4326&f=geojson'
        );
        
        if (!response.ok) throw new Error('Upstream failed');
        
        const data = await response.json();
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).json(data);
        
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch tract data' });
    }
}
