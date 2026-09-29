"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Category, Profile } from "@helphome/shared";
import { saveProviderProfileAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

export function ProfileForm({
  profile,
  categories,
  selected,
}: {
  profile: Profile;
  categories: Category[];
  selected: number[];
}) {
  const [state, action, pending] = useActionState(saveProviderProfileAction, undefined);
  return (
    <form action={action} className="card mt-6 space-y-5">
      <fieldset>
        <legend className="label">Serviços que você faz</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 p-2.5 text-sm has-checked:border-brand-500 has-checked:bg-brand-50">
              <input type="checkbox" name="category_ids" value={c.id} defaultChecked={selected.includes(c.id)} className="accent-brand-500" />
              {c.icon} {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="full_name">Nome</label>
        <input className="input" id="full_name" name="full_name" defaultValue={profile.full_name} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Telefone (WhatsApp)</label>
          <input className="input" id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="city">Cidade onde atende</label>
          <input className="input" id="city" name="city" defaultValue={profile.city ?? ""} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bio">Sobre você</label>
        <textarea
          className="input min-h-24"
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          placeholder="Experiência, especialidades, certificações…"
          maxLength={1000}
        />
      </div>
      <FormError message={state?.error} />
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Perfil salvo! <Link href="/prestador" className="font-semibold underline">Ver pedidos disponíveis</Link>
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar perfil"}</button>
    </form>
  );
}
