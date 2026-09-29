"use client";

import dynamic from "next/dynamic";

// O Leaflet usa `window`, então o mapa só carrega no navegador.
export const Map = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-xl bg-slate-100" />,
});

export type { MapPin, MapCircle } from "./leaflet-map";
