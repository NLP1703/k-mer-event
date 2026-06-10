// Forward geocoding (Cameroon-restricted), returns { latitude, longitude, label } or null.
//
// In production the site is often served over plain HTTP (no domain/HTTPS) and
// calling Nominatim directly from the browser can be unreliable (CORS / usage
// policy). So we geocode through our OWN backend proxy first (same origin via
// /api/geocode — always works), and only fall back to calling Nominatim
// directly from the browser if the proxy is unreachable.
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// 1) Backend proxy (reliable: same origin, works over HTTP, proper User-Agent).
const searchViaBackend = async (q) => {
  try {
    const res = await fetch(`${apiBase}/geocode?q=${encodeURIComponent(q)}&country=cm`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.result ? data.result : null;
  } catch {
    return null;
  }
};

// 2) Fallback: call Nominatim directly from the browser.
const searchDirect = async (q) => {
  const params = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'cm', q });
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

const search = async (query) => {
  const q = (query || '').trim();
  if (!q) return null;
  return (await searchViaBackend(q)) || (await searchDirect(q));
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
