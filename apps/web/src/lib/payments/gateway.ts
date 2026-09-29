import type { Payment } from "@helphome/shared";
import { mercadoPagoGateway } from "./mercadopago";
import { simulatedGateway } from "./simulated";

export interface CheckoutInput {
  payment: Payment;
  title: string;
  payerEmail?: string;
  siteUrl: string;
  /** Para onde o cliente volta depois de pagar. */
  backUrl: string;
}

export interface PaymentGateway {
  name: string;
  /** Cria o checkout e devolve a URL para onde o cliente deve ir pagar. */
  createCheckout(input: CheckoutInput): Promise<string>;
  /** Devolve o dinheiro ao cliente. */
  refund(payment: Payment): Promise<void>;
}

/** O modo de teste só vale em desenvolvimento ou quando ligado de propósito. */
export function isTestModeAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.PAGAMENTO_MODO_TESTE === "true";
}

/** Usa o Mercado Pago quando o token está configurado; senão, o modo de teste (se permitido). */
export function getGateway(): PaymentGateway {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) return mercadoPagoGateway;
  if (isTestModeAllowed()) return simulatedGateway;
  throw new Error("Pagamento não configurado: defina MERCADOPAGO_ACCESS_TOKEN");
}
