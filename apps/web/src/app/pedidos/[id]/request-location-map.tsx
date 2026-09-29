"use client";

import type { LatLng } from "@helphome/shared";
import { Map } from "@/components/map";

/** Mapa do pedido: ponto exato para as partes, área aproximada para os demais. */
export function RequestLocationMap({
  exact,
  approx,
  base,
  icon,
}: {
  exact: LatLng | null;
  approx: LatLng | null;
  base: LatLng | null;
  icon: string;
}) {
  const point = exact ?? approx;
  if (!point) return null;
  return (
    <Map
      center={point}
      zoom={exact ? 16 : 14}
      className="h-56"
      pins={[
        ...(exact ? [{ id: "exact", position: exact, icon }] : []),
        ...(base ? [{ id: "base", position: base, icon: "🧰", tone: "dark" as const }] : []),
      ]}
      circles={exact ? [] : [{ center: point, radiusKm: 0.8 }]}
    />
  );
}
