import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vite serves node_modules assets fine, but Leaflet's default marker icons
// resolve via relative paths that break under bundlers — point them at the
// CDN copies instead of shipping our own icon files.
const userIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'partner-map-user-marker',
});
const partnerIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/** Re-centers/fits the map whenever the point set changes. */
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      map.fitBounds(points, { padding: [32, 32], maxZoom: 13 });
    }
  }, [points, map]);
  return null;
}

/**
 * Shows the user's location and ranked Channel Partners (Module 4 output)
 * on an OpenStreetMap tile map. No API key required.
 *
 * Props:
 *   userLocation   — { lat, lon }
 *   partners       — ranked_partners[] (each needs latitude/longitude)
 *   selectedId     — partner_id currently highlighted in the list
 *   onSelect(id)   — called when a marker is clicked
 */
export default function PartnerMap({ userLocation, partners = [], selectedId, onSelect }) {
  const withCoords = partners.filter(p => p.latitude != null && p.longitude != null);
  const points = [
    ...(userLocation ? [[userLocation.lat, userLocation.lon]] : []),
    ...withCoords.map(p => [p.latitude, p.longitude]),
  ];

  if (!points.length) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-navy-100" style={{ height: 320 }}>
      <MapContainer center={points[0]} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {withCoords.map(p => (
          <Marker
            key={p.partner_id}
            position={[p.latitude, p.longitude]}
            icon={partnerIcon}
            eventHandlers={{ click: () => onSelect?.(p.partner_id) }}
            opacity={selectedId && selectedId !== p.partner_id ? 0.6 : 1}
          >
            <Popup>
              <strong>{p.name}</strong><br />
              {p.district}, {p.state} — {p.distance_km} km<br />
              {p.contact_phone}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
