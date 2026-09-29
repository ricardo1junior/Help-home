import type { Metadata } from "next";
import { syncMercadoPagoPayment } from "@/lib/payments/confirm";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Pagamento" };

// Volta do checkout do Mercado Pago para quem pagou pelo app.
export default async function PagamentoAppPage({ searchParams }: PageProps<"/app/pagamento-concluido">) {
  const { payment_id: mpPaymentId, external_reference: paymentId, status } = await searchParams;
  if (typeof mpPaymentId === "string" && mpPaymentId) {
    await syncMercadoPagoPayment(mpPaymentId).catch((err) => console.error("Retorno Mercado Pago (app)", err));
  }
  let requestId: string | null = null;
  if (typeof paymentId === "string" && hasAdminKey()) {
    const { data } = await createAdminClient().from("payments").select("request_id").eq("id", paymentId).maybeSingle();
    requestId = data?.request_id ?? null;
  }
  const approved = status === "approved";
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-5xl">{approved ? "✅" : "⏳"}</p>
      <h1 className="mt-4 text-xl font-bold">{approved ? "Pagamento recebido!" : "Pagamento em processamento"}</h1>
      <p className="mt-2 text-sm text-slate-600">Pode voltar para o app do Help Home.</p>
      <a href={requestId ? `helphome://pedido/${requestId}` : "helphome://"} className="btn-primary mt-6">
        Voltar para o app
      </a>
    </div>
  );
}
