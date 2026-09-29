import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice, getPayment, getRequest, PAYMENT_STATUS_LABEL } from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { startCheckoutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Pagamento" };

export default async function PagamentoPage({ params }: PageProps<"/pagamento/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile("client");
  const payment = await getPayment(supabase, id);
  if (!payment || payment.client_id !== profile.id) notFound();
  const request = await getRequest(supabase, payment.request_id);
  if (!request) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Pagamento</h1>
      <div className="card mt-6 space-y-4">
        <div>
          <p className="text-sm text-slate-500">{request.category.icon} {request.category.name}</p>
          <p className="font-semibold">{request.title}</p>
          <p className="text-sm text-slate-600">
            com {request.provider?.company_name || request.provider?.full_name}
          </p>
        </div>
        <p className="text-3xl font-bold">{formatPrice(payment.amount_cents)}</p>
        <ul className="space-y-2 rounded-xl bg-green-50 p-4 text-sm text-green-900">
          <li>🔒 O valor fica retido com o Help Home e só é liberado ao prestador quando você confirmar que o serviço foi feito.</li>
          <li>🧾 O pagamento pelo app é o seu comprovante e garante a garantia do serviço.</li>
          <li>↩️ Se cancelar antes do início, você recebe o dinheiro de volta.</li>
        </ul>
        {payment.status === "pending" && request.status === "awaiting_payment" ? (
          <form action={startCheckoutAction.bind(null, payment.id)}>
            <SubmitButton className="btn-primary w-full py-3 text-base" pendingText="Abrindo pagamento…">
              Pagar com Pix, cartão ou boleto
            </SubmitButton>
          </form>
        ) : (
          <p className="text-sm font-medium">Situação: {PAYMENT_STATUS_LABEL[payment.status]}</p>
        )}
        <Link href={`/pedidos/${payment.request_id}`} className="btn-secondary w-full">Voltar ao pedido</Link>
      </div>
    </div>
  );
}
