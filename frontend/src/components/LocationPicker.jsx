import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Loader2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { geocodePlace } from '../lib/geocode.js';

/**
 * Latitude/longitude inputs that fill themselves automatically from the event
 * location. As soon as the venue/city change, we geocode "venue, city, Cameroun"
 * (debounced) and set the coordinates. A "use my position" button and manual
 * editing remain available as fallbacks.
 *
 * Controlled: pass `latitude`/`longitude`, `venue`/`city`, and `onChange(field, value)`.
 */
function LocationPicker({ latitude, longitude, venue, city, onChange, inputClass = '' }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | searching | found | notfound
  const lastQuery = useRef(null);

  const runGeocode = async () => {
    setStatus('searching');
    const result = await geocodePlace({ venue, city });
    if (result) {
      onChange('latitude', Number(result.latitude.toFixed(6)));
      onChange('longitude', Number(result.longitude.toFixed(6)));
      setStatus('found');
    } else {
      setStatus('notfound');
    }
  };

  // Auto-geocode when the place changes (debounced). We skip the very first run
  // so editing an existing event doesn't overwrite saved coordinates on mount.
  useEffect(() => {
    const query = [venue, city].map((s) => (s || '').trim()).filter(Boolean).join(', ');
    if (lastQuery.current === null) {
      lastQuery.current = query;
      return;
    }
    if (!query || query === lastQuery.current) return;
    lastQuery.current = query;
    const handle = setTimeout(() => runGeocode(), 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, city]);

  const useMyLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange('latitude', Number(pos.coords.latitude.toFixed(6)));
        onChange('longitude', Number(pos.coords.longitude.toFixed(6)));
        setStatus('idle');
        setLocating(false);
      },
      () => {
        setError('Impossible d’obtenir votre position (permission refusée ?).');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const place = [venue, city].map((s) => (s || '').trim()).filter(Boolean).join(', ');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="block text-sm text-muted">Localisation (remplie automatiquement)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => place && runGeocode()}
            disabled={!place || status === 'searching'}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition border rounded-full border-border text-fg hover:border-primary hover:bg-surface-hover disabled:opacity-60"
          >
            {status === 'searching' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            Localiser depuis le lieu
          </button>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition border rounded-full border-border text-fg hover:border-primary hover:bg-surface-hover disabled:opacity-60"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
            Ma position
          </button>
        </div>
      </div>

      {status === 'searching' ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recherche des coordonnées du lieu…
        </p>
      ) : status === 'found' ? (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="w-3.5 h-3.5" /> Coordonnées trouvées automatiquement (ajustables ci-dessous).
        </p>
      ) : status === 'notfound' ? (
        <p className="flex items-center gap-1.5 text-xs text-warm">
          <AlertCircle className="w-3.5 h-3.5" /> Lieu introuvable — précisez le lieu/la ville ou saisissez les coordonnées.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-muted">
          Latitude
          <input
            type="number"
            step="any"
            placeholder="ex. 3.848"
            value={latitude}
            onChange={(e) => onChange('latitude', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-muted">
          Longitude
          <input
            type="number"
            step="any"
            placeholder="ex. 11.502"
            value={longitude}
            onChange={(e) => onChange('longitude', e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export default LocationPicker;
