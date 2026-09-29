import type { Payment } from "@helphome/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGateway } from "./gateway";
import { getMercadoPagoPayment } from "./mercadopago";

/** Marca o pagamento como pago (valor retido) e libera o início do serviço. */
export async function markPaymentHeld(paymentId: string, gateway: string, ref: string, method: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_payment_held", {
    p_payment_id: paymentId,
    p_gateway: gateway,
    p_gateway_ref: ref,
    p_method: method,
  });
  if (error) throw new Error(error.message);
}

/**
 * Confere um pagamento no Mercado Pago e, se aprovado e com o valor certo,
 * confirma no Help Home. Usado pelo webhook e pela página de retorno.
 */
export async function syncMercadoPagoPayment(mpPaymentId: string): Promise<"held" | "ignored"> {
  const mp = await getMercadoPagoPayment(mpPaymentId);
  if (mp.status !== "approved" || !mp.external_reference) return "ignored";

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("id", mp.external_reference)
    .maybeSingle<Payment>();
  if (!payment || payment.status !== "pending") return "ignored";
  if (Math.round(mp.transaction_amount * 100) !== payment.amount_cents) {
    throw new Error(`Valor pago (${mp.transaction_amount}) diferente do esperado para ${payment.id}`);
  }
  await markPaymentHeld(payment.id, "mercadopago", String(mp.id), mp.payment_method_id);
  return "held";
}

/** Depois de um cancelamento, devolve o dinheiro ao cliente se ele já tinha pago. */
export async function refundIfNeeded(requestId: string) {
  const admin = createAdminClient();
  const { data: payments } = await admin
    .from("payments")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "refund_pending")
    .returns<Payment[]>();
  for (const payment of payments ?? []) {
    const gateway = payment.gateway === "mercadopago" ? getGateway() : { refund: async () => {} };
    await gateway.refund(payment);
    const { error } = await admin.rpc("mark_payment_refunded", { p_payment_id: payment.id });
    if (error) throw new Error(error.message);
  }
}
