import Link from "next/link";
import type { Metadata } from "next";
import { listClientRequests } from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { RequestCard } from "@/components/request-card";

export const metadata: Metadata = { title: "Meus pedidos" };

export default async function PedidosPage() {
  const { supabase, profile } = await requireProfile("client");
  const requests = await listClientRequests(supabase, profile.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meus pedidos</h1>
          <p className="text-sm text-slate-600">Olá, {profile.full_name.split(" ")[0] || "tudo bem"}!</p>
        </div>
        <Link href="/pedidos/novo" className="btn-primary">+ Novo pedido</Link>
      </div>

      {requests.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-4xl">🧰</p>
          <p className="mt-2 font-medium">Você ainda não fez nenhum pedido.</p>
          <p className="text-sm text-slate-600">Descreva o que precisa e receba orçamentos de profissionais.</p>
          <Link href="/pedidos/novo" className="btn-primary mt-4">Pedir um serviço</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
