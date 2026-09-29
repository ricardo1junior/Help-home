"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "@helphome/shared";

export interface MapPin {
  id: string;
  position: LatLng;
  icon: string;
  tone?: "brand" | "dark" | "muted";
  popup?: React.ReactNode;
  draggable?: boolean;
  onDragEnd?: (position: LatLng) => void;
}

export interface MapCircle {
  center: LatLng;
  radiusKm: number;
  tone?: "brand" | "muted";
}

// Ícones em HTML para não depender das imagens padrão do Leaflet.
function pinIcon(emoji: string, tone: MapPin["tone"] = "brand") {
  return L.divIcon({
    className: "",
    html: `<div class="hh-pin hh-pin-${tone}"><span>${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

function FitTo({ points, circles }: { points: LatLng[]; circles: MapCircle[] }) {
  const map = useMap();
  const key = JSON.stringify([points, circles.map((c) => [c.center, c.radiusKm])]);
  useEffect(() => {
    const bounds = L.latLngBounds([]);
    points.forEach((p) => bounds.extend([p.lat, p.lng]));
    circles.forEach((c) => bounds.extend(L.latLng(c.center.lat, c.center.lng).toBounds(c.radiusKm * 2000)));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function LeafletMap({
  center,
  zoom = 13,
  pins = [],
  circles = [],
  fit = true,
  onMapClick,
  className = "h-80",
}: {
  center: LatLng;
  zoom?: number;
  pins?: MapPin[];
  circles?: MapCircle[];
  fit?: boolean;
  onMapClick?: (p: LatLng) => void;
  className?: string;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={`z-0 w-full overflow-hidden rounded-xl border border-slate-200 ${className}`}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {circles.map((c, i) => (
        <Circle
          key={i}
          center={[c.center.lat, c.center.lng]}
          radius={c.radiusKm * 1000}
          pathOptions={
            c.tone === "muted"
              ? { color: "#64748b", weight: 1, fillOpacity: 0.05, dashArray: "4 4" }
              : { color: "#f97316", weight: 1, fillOpacity: 0.12 }
          }
        />
      ))}
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.position.lat, p.position.lng]}
          icon={pinIcon(p.icon, p.tone)}
          draggable={p.draggable}
          eventHandlers={
            p.onDragEnd
              ? {
                  dragend: (e) => {
                    const ll = (e.target as L.Marker).getLatLng();
                    p.onDragEnd?.({ lat: ll.lat, lng: ll.lng });
                  },
                }
              : undefined
          }
        >
          {p.popup && <Popup>{p.popup}</Popup>}
        </Marker>
      ))}
      {fit && <FitTo points={pins.map((p) => p.position)} circles={circles} />}
      {onMapClick && <ClickHandler onClick={onMapClick} />}
    </MapContainer>
  );
}
