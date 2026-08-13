import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/** Parses the stored "lat,lng" pin string. Returns null if missing/malformed. */
export function parsePin(pin?: string | null): { lat: number; lng: number } | null {
  if (!pin) return null;
  const [latStr, lngStr] = pin.split(',');
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export default function LocationView({ pin }: { pin?: string | null }) {
  const pos = parsePin(pin);
  if (!pos) return null;

  return (
    <div>
      <div className="rounded-lg overflow-hidden border" style={{ height: 220 }}>
        <MapContainer center={pos} zoom={15} style={{ height: '100%', width: '100%' }} dragging={false} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={pos} icon={icon} />
        </MapContainer>
      </div>
      <a
        href={`https://www.google.com/maps?q=${pos.lat},${pos.lng}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary mt-1 inline-block"
      >
        Google Maps मा खोल्नुहोस् →
      </a>
    </div>
  );
}
