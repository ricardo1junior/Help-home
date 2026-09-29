import type { Metadata } from "next";
import { getProviderCategoryIds, listCategories } from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const { supabase, profile } = await requireProfile("provider");
  const [categories, selected] = await Promise.all([
    listCategories(supabase),
    getProviderCategoryIds(supabase, profile.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Meu perfil</h1>
      <p className="text-sm text-slate-600">É isso que os clientes veem quando você envia um orçamento.</p>
      <ProfileForm profile={profile} categories={categories} selected={selected} />
    </div>
  );
}
