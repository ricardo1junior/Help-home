"use client";

import { useState } from "react";
import { DEFAULT_CENTER, type LatLng } from "@helphome/shared";
import { Map } from ".";

/**
 * Escolha de um ponto no mapa: pela localização do aparelho, pela busca do
 * endereço ou clicando/arrastando o marcador.
 */
export function LocationPicker({
  value,
  onChange,
  address,
  icon = "📍",
  radiusKm,
  hint,
}: {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  /** Texto usado no botão "buscar pelo endereço". */
  address?: string;
  icon?: string;
  radiusKm?: number;
  hint?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return setStatus("Seu navegador não permite pegar a localização.");
    setBusy(true);
    setStatus(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(false);
      },
      () => {
        setStatus("Não conseguimos pegar sua localização. Busque pelo endereço ou toque no mapa.");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function searchAddress() {
    if (!address?.trim()) return setStatus("Preencha o endereço e a cidade primeiro.");
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
      const data = (await res.json()) as { lat?: number; lng?: number };
      if (data.lat == null || data.lng == null) throw new Error();
      onChange({ lat: data.lat, lng: data.lng });
    } catch {
      setStatus("Não encontramos esse endereço. Toque no mapa para marcar o local.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useMyLocation} disabled={busy} className="btn-secondary py-2 text-xs">
          📡 Usar minha localização
        </button>
        {address !== undefined && (
          <button type="button" onClick={searchAddress} disabled={busy} className="btn-secondary py-2 text-xs">
            🔎 Buscar pelo endereço
          </button>
        )}
      </div>
      <Map
        center={value ?? DEFAULT_CENTER}
        zoom={value ? 15 : 11}
        fit={Boolean(value)}
        className="h-64"
        onMapClick={onChange}
        pins={value ? [{ id: "picked", position: value, icon, draggable: true, onDragEnd: onChange }] : []}
        circles={value && radiusKm ? [{ center: value, radiusKm }] : []}
      />
      <p className="text-xs text-slate-500">
        {status ?? hint ?? (value ? "Arraste o marcador para ajustar." : "Toque no mapa para marcar o local.")}
      </p>
    </div>
  );
}
