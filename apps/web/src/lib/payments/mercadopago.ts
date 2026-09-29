import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentGateway } from "./gateway";

const API = "https://api.mercadopago.com";

function token() {
  const value = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!value) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return value;
}

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/**
 * Checkout Pro do Mercado Pago (Pix, cartão e boleto). O dinheiro cai na conta da
 * plataforma e fica retido até o cliente confirmar o serviço; o repasse ao prestador
 * é feito depois (manual por enquanto).
 */
export const mercadoPagoGateway: PaymentGateway = {
  name: "mercadopago",

  async createCheckout({ payment, title, payerEmail, siteUrl }) {
    const back = `${siteUrl}/pagamento/${payment.id}/retorno`;
    const preference = await mp<{ init_point: string }>("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: payment.request_id,
            title: `Help Home: ${title}`.slice(0, 250),
            quantity: 1,
            currency_id: "BRL",
            unit_price: payment.amount_cents / 100,
          },
        ],
        external_reference: payment.id,
        payer: payerEmail ? { email: payerEmail } : undefined,
        back_urls: { success: back, pending: back, failure: back },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/pagamentos/mercadopago`,
        statement_descriptor: "HELPHOME",
      }),
    });
    return preference.init_point;
  },

  async refund(payment) {
    if (!payment.gateway_ref) return;
    await mp(`/v1/payments/${payment.gateway_ref}/refunds`, {
      method: "POST",
      headers: { "X-Idempotency-Key": `refund-${payment.id}` },
      body: "{}",
    });
  },
};

export interface MercadoPagoPayment {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  payment_method_id: string;
}

export function getMercadoPagoPayment(id: string) {
  return mp<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

/** Confere a assinatura x-signature enviada pelo Mercado Pago nas notificações. */
export function isValidMercadoPagoSignature(dataId: string, xSignature: string | null, xRequestId: string | null) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // sem segredo configurado, a checagem é feita consultando a API
  if (!xSignature) return false;
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.trim().split("=", 2) as [string, string]),
  );
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId ?? ""};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
