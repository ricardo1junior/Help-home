"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZodError } from "zod";
import { createRequest, MAX_PHOTOS, uploadRequestPhoto, type Category } from "@helphome/shared";
import { createClient } from "@/lib/supabase/client";
import { FormError } from "@/components/form-error";

export function NewRequestForm({
  categories,
  userId,
  defaultCity,
}: {
  categories: Category[];
  userId: string;
  defaultCity: string;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const photos = await Promise.all(
        files.map((file) =>
          uploadRequestPhoto(supabase, userId, file, file.name.split(".").pop() || "jpg", file.type),
        ),
      );
      const { id } = await createRequest(
        supabase,
        userId,
        {
          category_id: categoryId ?? 0,
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          address: String(form.get("address") ?? ""),
          city: String(form.get("city") ?? ""),
          preferred_date: String(form.get("preferred_date") ?? ""),
        },
        photos,
      );
      router.push(`/pedidos/${id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ZodError
          ? (err.issues[0]?.message ?? "Dados inválidos.")
          : "Não foi possível publicar o pedido. Tente novamente.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 space-y-5">
      <fieldset>
        <legend className="label">Categoria</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`rounded-lg border p-3 text-center text-xs font-medium ${
                categoryId === c.id ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="block text-2xl">{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="title">Título</label>
        <input className="input" id="title" name="title" placeholder="Ex.: Torneira da cozinha pingando" required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <textarea
          className="input min-h-28"
          id="description"
          name="description"
          placeholder="O que aconteceu, desde quando, o que já tentou…"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">Endereço</label>
          <input className="input" id="address" name="address" placeholder="Rua, número, bairro" required />
        </div>
        <div>
          <label className="label" htmlFor="city">Cidade</label>
          <input className="input" id="city" name="city" defaultValue={defaultCity} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="preferred_date">Data preferida (opcional)</label>
          <input className="input" id="preferred_date" name="preferred_date" type="date" />
        </div>
        <div>
          <label className="label" htmlFor="photos">Fotos (até {MAX_PHOTOS})</label>
          <input
            className="input file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-2 file:py-1 file:text-brand-700"
            id="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS))}
          />
        </div>
      </div>
      <FormError message={error} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Publicando…" : "Publicar pedido"}
      </button>
    </form>
  );
}
