// Forward geocoding via OpenStreetMap Nominatim (free, no API key).
// Results are restricted to Cameroon (countrycodes=cm).
// Returns { latitude, longitude, label } for the best match, or null.
// Note: Nominatim's usage policy asks for low request volume — we only call
// this on a debounced change of the venue/city fields.
const search = async (query) => {
  const q = (query || '').trim();
  if (!q) return null;
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'cm', // restrict to Cameroon
    q,
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      const lat = Number(data[0].lat);
      const lon = Number(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { latitude: lat, longitude: lon, label: data[0].display_name };
      }
    }
    return null;
  } catch {
    return null;
  }
};

// Try the most specific query first ("venue, city"), then fall back to the
// city alone, then the venue alone — all constrained to Cameroon. This makes
// real Cameroonian places resolve even when the full string isn't indexed.
export const geocodePlace = async ({ venue, city } = {}) => {
  const v = (venue || '').trim();
  const c = (city || '').trim();
  const candidates = [];
  if (v && c) candidates.push(`${v}, ${c}`);
  if (c) candidates.push(c);
  if (v) candidates.push(v);
  // de-duplicate while preserving order
  const seen = new Set();
  for (const q of candidates) {
    if (seen.has(q)) continue;
    seen.add(q);
    const result = await search(q);
    if (result) return result;
  }
  return null;
};
