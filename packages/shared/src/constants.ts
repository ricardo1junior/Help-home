import type { QuoteStatus, RequestStatus } from "./types";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Aguardando orçamentos",
  assigned: "Prestador escolhido",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  pending: "Aguardando resposta",
  accepted: "Aceito",
  rejected: "Recusado",
  withdrawn: "Retirado",
};

export const PHOTOS_BUCKET = "request-photos";
export const MAX_PHOTOS = 5;
