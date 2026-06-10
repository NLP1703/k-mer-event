import express from 'express';

const router = express.Router();

// GET /api/geocode?q=<place>&country=cm
// Server-side proxy to OpenStreetMap Nominatim. Doing the geocoding on the
// server (instead of the browser) makes it reliable in production: it works
// over plain HTTP, avoids browser CORS issues, and lets us send a proper
// User-Agent as required by Nominatim's usage policy.
// Requires Node 18+ (global fetch). Returns { result: { latitude, longitude, label } | null }.
router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ result: null });

  const country = (req.query.country || 'cm').toString();
  const params = new URLSearchParams({ format: 'json', limit: '1', countrycodes: country, q });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'K-MER-EVENT/1.0 (events platform; contact@kmer-event.com)',
        Accept: 'application/json',
      },
    });
    if (!r.ok) return res.json({ result: null });
    const data = await r.json();
    if (Array.isArray(data) && data.length) {
      const lat = Number(data[0].lat);
      const lon = Number(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return res.json({ result: { latitude: lat, longitude: lon, label: data[0].display_name } });
      }
    }
    return res.json({ result: null });
  } catch (err) {
    console.warn('⚠️ geocode proxy failed:', err?.message || err);
    return res.json({ result: null });
  }
});

export default router;
