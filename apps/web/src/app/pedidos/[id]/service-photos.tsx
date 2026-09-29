"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addServicePhoto, deleteServicePhoto, uploadRequestPhoto, type PhotoKind, type ServicePhoto } from "@helphome/shared";
import { createClient } from "@/lib/supabase/client";

const LABEL: Record<PhotoKind, string> = { before: "Antes", after: "Depois" };

export function ServicePhotos({
  requestId,
  userId,
  photos,
  canUpload,
}: {
  requestId: string;
  userId: string;
  photos: ServicePhoto[];
  canUpload: boolean;
}) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      {(["before", "after"] as const).map((kind) => (
        <PhotoColumn
          key={kind}
          kind={kind}
          requestId={requestId}
          userId={userId}
          photos={photos.filter((p) => p.kind === kind)}
          canUpload={canUpload}
        />
      ))}
    </div>
  );
}

function PhotoColumn({
  kind,
  requestId,
  userId,
  photos,
  canUpload,
}: {
  kind: PhotoKind;
  requestId: string;
  userId: string;
  photos: ServicePhoto[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const supabase = createClient();
      for (const file of Array.from(files)) {
        const url = await uploadRequestPhoto(supabase, userId, file, file.name.split(".").pop() || "jpg", file.type);
        await addServicePhoto(supabase, userId, requestId, kind, url);
      }
      router.refresh();
    } catch {
      window.alert("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteServicePhoto(createClient(), id);
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{LABEL[kind]}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative">
            <a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Foto de ${LABEL[kind].toLowerCase()}`} className="aspect-square w-full rounded-lg object-cover" />
            </a>
            {canUpload && p.uploaded_by === userId && (
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
                aria-label="Remover foto"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {canUpload && (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-slate-300 text-center text-xs text-slate-500 hover:border-brand-500">
            {busy ? "Enviando…" : "+ Foto"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-label={`Adicionar foto de ${LABEL[kind].toLowerCase()}`}
              disabled={busy}
              onChange={(e) => upload(e.target.files)}
            />
          </label>
        )}
        {!canUpload && photos.length === 0 && <p className="col-span-3 text-xs text-slate-500">Nenhuma foto ainda.</p>}
      </div>
    </div>
  );
}
