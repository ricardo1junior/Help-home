"use client";

import Link from "next/link";
import { formatDistance, type LatLng, type NearbyRequest } from "@helphome/shared";
import { Map } from "@/components/map";

export function RequestsMap({
  origin,
  radiusKm,
  requests,
}: {
  origin: LatLng;
  radiusKm: number | null;
  requests: NearbyRequest[];
}) {
  const located = requests.filter((r) => r.approx_lat != null && r.approx_lng != null);
  return (
    <div className="space-y-2">
      <Map
        center={origin}
        className="h-[28rem]"
        circles={radiusKm ? [{ center: origin, radiusKm }] : []}
        pins={[
          { id: "origin", position: origin, icon: "🧰", tone: "dark", popup: <strong>Você está aqui</strong> },
          ...located.map((r) => ({
            id: r.id,
            position: { lat: r.approx_lat!, lng: r.approx_lng! },
            icon: r.category.icon,
            tone: r.already_quoted ? ("muted" as const) : ("brand" as const),
            popup: (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">
                  {r.category.name}
                  {r.distance_km != null && ` · a ${formatDistance(r.distance_km)}`}
                </p>
                <p className="font-semibold">{r.title}</p>
                <Link href={`/pedidos/${r.id}`} className="font-medium text-brand-700">
                  {r.already_quoted ? "Ver pedido" : "Enviar orçamento →"}
                </Link>
              </div>
            ),
          })),
        ]}
      />
      <p className="text-xs text-slate-500">
        Os marcadores mostram a região aproximada (cerca de 1 km). O endereço exato aparece quando o cliente escolhe você.
        {located.length < requests.length && ` ${requests.length - located.length} pedido(s) sem local no mapa aparecem só na lista.`}
      </p>
    </div>
  );
}
