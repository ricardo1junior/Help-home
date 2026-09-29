"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { RADIUS_OPTIONS_KM } from "@helphome/shared";

/** Alterna lista/mapa, muda o raio e usa a localização atual do aparelho. */
export function NearbyControls({ view, radius, usingCurrent }: { view: "lista" | "mapa"; radius: string; usingCurrent: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [locating, setLocating] = useState(false);

  function go(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    next.set("aba", "disponiveis");
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.push(`/prestador?${next.toString()}`);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        go({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) });
      },
      () => {
        setLocating(false);
        window.alert("Não conseguimos pegar sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm" role="group" aria-label="Modo de visualização">
        {(["lista", "mapa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => go({ ver: v })}
            aria-pressed={view === v}
            className={`rounded-md px-3 py-1.5 font-medium ${view === v ? "bg-brand-500 text-white" : "text-slate-600"}`}
          >
            {v === "lista" ? "☰ Lista" : "🗺️ Mapa"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="raio" className="text-slate-600">Até</label>
        <select id="raio" className="input w-auto py-1.5" value={radius} onChange={(e) => go({ raio: e.target.value })}>
          {RADIUS_OPTIONS_KM.map((km) => (
            <option key={km} value={km}>{km} km</option>
          ))}
          <option value="todos">Qualquer distância</option>
        </select>
        {usingCurrent ? (
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => go({ lat: null, lng: null })}>
            Voltar para minha base
          </button>
        ) : (
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={useCurrentLocation} disabled={locating}>
            📡 {locating ? "Localizando…" : "Estou em outro lugar"}
          </button>
        )}
      </div>
    </div>
  );
}
