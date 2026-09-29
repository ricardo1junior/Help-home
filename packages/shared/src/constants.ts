import type { ClaimStatus, PaymentStatus, QuoteStatus, RequestStatus } from "./types";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Aguardando orçamentos",
  awaiting_payment: "Aguardando pagamento",
  assigned: "Pago, aguardando início",
  in_progress: "Em andamento",
  awaiting_confirmation: "Aguardando confirmação do cliente",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  pending: "Aguardando resposta",
  accepted: "Aceito",
  rejected: "Recusado",
  withdrawn: "Retirado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Aguardando pagamento",
  held: "Pago e retido com segurança",
  released: "Liberado ao prestador",
  refund_pending: "Estorno em andamento",
  refunded: "Estornado",
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  open: "Em aberto",
  resolved: "Resolvido",
};

export const PHOTOS_BUCKET = "request-photos";
export const MAX_PHOTOS = 5;

/** Garantia mínima de serviços pelo Código de Defesa do Consumidor (art. 26). */
export const MIN_WARRANTY_DAYS = 90;
