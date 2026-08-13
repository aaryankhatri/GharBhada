import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite bundles Leaflet's default marker image paths incorrectly — point them at the bundled assets.
const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const KATHMANDU_CENTER: [number, number] = [27.7172, 85.324];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number }) => void;
}) {
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return alert('यो browser मा location पत्ता लगाउन सकिँदैन');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        alert('Location पत्ता लगाउन सकिएन — नक्सामा क्लिक गरेर सिधै छान्नुहोस्');
        setLocating(false);
      }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">नक्सामा क्लिक गरेर घरको ठ्याक्कै स्थान छान्नुहोस्</p>
        <button type="button" className="btn-outline text-xs px-2 py-1" onClick={useMyLocation} disabled={locating}>
          {locating ? 'पत्ता लगाउँदै...' : '📍 मेरो हालको स्थान'}
        </button>
      </div>
      <div className="rounded-lg overflow-hidden border" style={{ height: 300 }}>
        <MapContainer center={value ?? KATHMANDU_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={(lat, lng) => onChange({ lat, lng })} />
          {value && <Marker position={value} icon={icon} />}
        </MapContainer>
      </div>
      {value ? (
        <p className="text-xs text-gray-500 mt-1">छानिएको स्थान: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</p>
      ) : (
        <p className="text-xs text-amber-600 mt-1">अझै स्थान छानिएको छैन</p>
      )}
    </div>
  );
}
