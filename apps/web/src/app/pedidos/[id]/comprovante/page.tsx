import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  formatCnpj,
  formatDate,
  formatDateTime,
  formatHours,
  formatPrice,
  getPaymentForRequest,
  getProfile,
  getRequest,
  listQuotes,
} from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Comprovante do serviço" };

// Comprovante que vincula o serviço, o cliente, o prestador (CNPJ) e o pagamento feito pelo app.
export default async function ComprovantePage({ params }: PageProps<"/pedidos/[id]/comprovante">) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const request = await getRequest(supabase, id);
  if (!request || request.status !== "completed" || !request.provider_id) notFound();
  if (profile.id !== request.client_id && profile.id !== request.provider_id) notFound();

  const [payment, provider, client, quotes] = await Promise.all([
    getPaymentForRequest(supabase, id),
    getProfile(supabase, request.provider_id),
    getProfile(supabase, request.client_id),
    listQuotes(supabase, id),
  ]);
  const quote = quotes.find((q) => q.status === "accepted");
  if (!payment || !provider || !client || !quote) notFound();

  const rows: [string, string][] = [
    ["Código do serviço", request.id.slice(0, 8).toUpperCase()],
    ["Serviço", `${request.category.name}: ${request.title}`],
    ["Endereço", `${request.address}, ${request.city}`],
    ["Cliente", client.full_name],
    ["Prestador", provider.company_name || provider.full_name],
    ["CNPJ do prestador", provider.cnpj ? formatCnpj(provider.cnpj) : "-"],
    ["Valor pago pelo app", formatPrice(payment.amount_cents)],
    ["Forma de pagamento", payment.method ? payment.method.toUpperCase() : "-"],
    ["Pago em", payment.paid_at ? formatDateTime(payment.paid_at) : "-"],
    ["Início do serviço", request.started_at ? formatDateTime(request.started_at) : "-"],
    ["Conclusão confirmada em", request.completed_at ? formatDateTime(request.completed_at) : "-"],
    ["Tempo estimado", formatHours(quote.estimated_hours)],
    ["Garantia", `${quote.warranty_days} dias, até ${formatDate(request.warranty_until!)}`],
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="card print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-600">🏠 Help Home</p>
            <h1 className="mt-1 text-xl font-bold">Comprovante de serviço</h1>
          </div>
          <PrintButton />
        </div>
        <dl className="mt-6 divide-y divide-slate-100 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-5 gap-3 py-2">
              <dt className="col-span-2 text-slate-500">{label}</dt>
              <dd className="col-span-3 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-xs text-slate-500">
          Este serviço foi contratado e pago pelo Help Home. Durante o período de garantia, o cliente pode acionar o prestador
          pelo app caso o problema volte a acontecer.
        </p>
      </div>
    </div>
  );
}
