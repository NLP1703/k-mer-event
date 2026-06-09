import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default marker icons under a bundler (Vite).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Satellite mini-map for a single event location (Esri World Imagery tiles,
 * free, no API key). Renders nothing when coordinates are missing/invalid.
 */
function EventLocationMap({ latitude, longitude, title, height = 320 }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid =
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  if (!valid) return null;

  return (
    <div className="overflow-hidden border rounded-2xl border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
      >
        {/* Esri satellite imagery */}
        <TileLayer
          attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {/* Esri place/boundary labels overlay so the imagery stays readable */}
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        <Marker position={[lat, lng]}>
          {title ? <Popup>{title}</Popup> : null}
        </Marker>
      </MapContainer>
    </div>
  );
}

export default EventLocationMap;
