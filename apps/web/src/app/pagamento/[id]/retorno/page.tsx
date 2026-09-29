import { redirect } from "next/navigation";
import { getPayment } from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { syncMercadoPagoPayment } from "@/lib/payments/confirm";

// Volta do checkout do Mercado Pago. Confirma o pagamento na hora, sem esperar o webhook.
export default async function RetornoPage({ params, searchParams }: PageProps<"/pagamento/[id]/retorno">) {
  const { id } = await params;
  const { payment_id: mpPaymentId } = await searchParams;
  const { supabase } = await requireProfile("client");
  const payment = await getPayment(supabase, id);
  if (!payment) redirect("/pedidos");

  if (typeof mpPaymentId === "string" && mpPaymentId && payment.status === "pending") {
    await syncMercadoPagoPayment(mpPaymentId).catch((err) => console.error("Retorno Mercado Pago", err));
  }
  redirect(`/pedidos/${payment.request_id}`);
}
