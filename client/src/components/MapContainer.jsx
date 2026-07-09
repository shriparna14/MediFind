import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Phone, Clock } from 'lucide-react';

// Reset leaflet icon urls to avoid broken asset resolution in Vite
delete L.Icon.Default.prototype._getIconUrl;

// Custom styled markers using Leaflet divIcon (Vite-safe and highly styled)
const createUserMarker = () => L.divIcon({
  html: `
    <div class="relative w-8 h-8 flex items-center justify-center">
      <div class="absolute inset-0 bg-sky-500 rounded-full opacity-50 animate-ping"></div>
      <div class="relative w-4.5 h-4.5 bg-sky-600 rounded-full border-2 border-white shadow-md"></div>
    </div>
  `,
  className: 'user-pin-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createPharmacyMarker = (isHighlighted) => L.divIcon({
  html: `
    <div class="w-10 h-10 ${isHighlighted ? 'bg-amber-500 ring-4 ring-amber-200 scale-110' : 'bg-brand-500 shadow-brand-500/20'} text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white transition-all duration-300">
      <span class="text-sm">🏥</span>
    </div>
  `,
  className: 'pharmacy-pin-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Component to dynamically re-center map view
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function MapWrapper({ userLocation, pharmacies, selectedPharmacy, onSelectPharmacy }) {
  // Center map on user location if available, otherwise Bengaluru center
  const defaultCenter = [12.9716, 77.5946];
  const mapCenter = userLocation && userLocation.latitude 
    ? [userLocation.latitude, userLocation.longitude] 
    : (selectedPharmacy ? [selectedPharmacy.latitude, selectedPharmacy.longitude] : defaultCenter);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner min-h-[300px]">
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="w-full h-full"
      >
        <ChangeView center={mapCenter} />
        
        {/* Modern styled Map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Current Location Marker */}
        {userLocation && userLocation.latitude && (
          <Marker 
            position={[userLocation.latitude, userLocation.longitude]} 
            icon={createUserMarker()}
          >
            <Popup>
              <div className="p-1 font-medium text-slate-800">
                📍 You are here
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pharmacy Markers */}
        {pharmacies.map((pharm) => {
          if (!pharm.latitude || !pharm.longitude) return null;
          const isSelected = selectedPharmacy && (selectedPharmacy.id === pharm.id || selectedPharmacy._id === pharm.id);
          
          return (
            <Marker
              key={pharm.id || pharm._id}
              position={[pharm.latitude, pharm.longitude]}
              icon={createPharmacyMarker(isSelected)}
              eventHandlers={{
                click: () => onSelectPharmacy && onSelectPharmacy(pharm),
              }}
            >
              <Popup>
                <div className="p-1 text-slate-800 max-w-[220px]">
                  <h4 className="font-bold text-sm text-slate-900 border-b pb-1.5 mb-1.5 border-slate-100 flex items-center gap-1.5">
                    🏥 {pharm.shopName || pharm.name}
                  </h4>
                  
                  <p className="text-xs text-slate-500 mb-2 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{pharm.address}</span>
                  </p>
                  
                  {pharm.phone && (
                    <p className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{pharm.phone}</span>
                    </p>
                  )}

                  {pharm.distance !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                        🚗 {pharm.distance} km away
                      </span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${pharm.latitude},${pharm.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-0.5"
                      >
                        Directions <Navigation className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Dynamic Route Polyline Path to Selected Pharmacy */}
        {userLocation && userLocation.latitude && selectedPharmacy && selectedPharmacy.latitude && (
          <Polyline 
            positions={[
              [userLocation.latitude, userLocation.longitude],
              [selectedPharmacy.latitude, selectedPharmacy.longitude]
            ]}
            color="#2f5d50"
            weight={3}
            dashArray="5, 8"
          />
        )}
      </MapContainer>

      {/* Floating Route ETA Badge Overlay */}
      {selectedPharmacy && userLocation && (selectedPharmacy.distance !== undefined || selectedPharmacy.latitude) && (
        <div className="absolute top-4 right-4 z-[1000] bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xl max-w-[200px] animate-fade-in flex flex-col gap-1.5 font-sans">
          <span className="text-[9px] text-brand-600 font-bold uppercase tracking-wider block">Optimal Route ETA</span>
          <span className="font-fraunces font-bold text-slate-900 text-xs leading-tight block">
            {selectedPharmacy.shopName || selectedPharmacy.name}
          </span>
          <div className="flex justify-between items-center mt-1 border-t pt-1.5 border-slate-100 font-mono-plex text-[10px]">
            <span className="text-accent-500 font-bold">⏱️ ~{Math.ceil((selectedPharmacy.distance || 3) * 2 + 3)} min</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">📍 {selectedPharmacy.distance || 3} km</span>
          </div>
        </div>
      )}
    </div>
  );
}
