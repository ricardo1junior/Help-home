import type { LatLng } from "./types";

/** Distância em km entre dois pontos (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return "menos de 1 km";
  return `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
}

/** Centro padrão do mapa quando ainda não há localização (São Paulo). */
export const DEFAULT_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 };

export const RADIUS_OPTIONS_KM = [5, 10, 20, 50, 100] as const;
