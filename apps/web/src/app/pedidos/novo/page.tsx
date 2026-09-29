import type { Metadata } from "next";
import { listCategories } from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { NewRequestForm } from "./new-request-form";

export const metadata: Metadata = { title: "Novo pedido" };

export default async function NovoPedidoPage() {
  const { supabase, profile } = await requireProfile("client");
  const categories = await listCategories(supabase);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Do que você precisa?</h1>
      <p className="text-sm text-slate-600">Quanto mais detalhes, mais certeiros os orçamentos.</p>
      <NewRequestForm categories={categories} userId={profile.id} defaultCity={profile.city ?? ""} />
    </div>
  );
}
