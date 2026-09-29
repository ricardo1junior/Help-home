import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice, getPayment } from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { isTestModeAllowed } from "@/lib/payments/gateway";
import { simulateApproveAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Pagamento de teste" };

// Tela usada enquanto o Mercado Pago não está configurado.
export default async function PagamentoSimuladoPage({ params }: PageProps<"/pagamento/[id]/simulado">) {
  const { id } = await params;
  if (process.env.MERCADOPAGO_ACCESS_TOKEN || !isTestModeAllowed()) notFound();
  const { supabase, profile } = await requireProfile("client");
  const payment = await getPayment(supabase, id);
  if (!payment || payment.client_id !== profile.id) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card space-y-4 border-dashed border-amber-400">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Modo de teste: nenhum valor é cobrado. Quando o Mercado Pago estiver configurado, esta etapa abre o checkout real.
        </p>
        <p className="text-sm text-slate-600">Pix de teste</p>
        <p className="text-3xl font-bold">{formatPrice(payment.amount_cents)}</p>
        <form action={simulateApproveAction.bind(null, payment.id)}>
          <SubmitButton className="btn-primary w-full" pendingText="Confirmando…">Simular Pix aprovado</SubmitButton>
        </form>
      </div>
    </div>
  );
}
