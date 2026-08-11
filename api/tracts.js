export default async function handler(req, res) {
    try {
        // Use data.gov or another open source that doesn't block server requests
        const response = await fetch(
            'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-united-states-of-america-tract/records?refine=ste_code:41&limit=100&format=geojson'
        );
        
        if (!response.ok) {
            // Fallback: try ArcGIS
            const altResponse = await fetch(
                'https://services1.arcgis.com/Ua5sDmgJbxcvNy4f/arcgis/rest/services/Census_Tracts_2020/FeatureServer/0/query?where=STATEFP=%2741%27&outFields=GEOID&returnGeometry=true&outSR=4326&f=geojson'
            );
            
            if (!altResponse.ok) throw new Error('All sources failed');
            
            const altData = await altResponse.json();
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).json(altData);
        }
        
        const data = await response.json();
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('Tract fetch error:', error.message);
        return res.status(200).json({ 
            type: 'FeatureCollection', 
            features: [] 
        });
    }
}
