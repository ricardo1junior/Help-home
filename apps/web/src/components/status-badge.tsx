import { QUOTE_STATUS_LABEL, REQUEST_STATUS_LABEL, type QuoteStatus, type RequestStatus } from "@helphome/shared";

const REQUEST_TONE: Record<RequestStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  awaiting_payment: "bg-orange-100 text-orange-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  awaiting_confirmation: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-200 text-slate-600",
};

const QUOTE_TONE: Record<QuoteStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-slate-200 text-slate-600",
  withdrawn: "bg-slate-200 text-slate-600",
};

const base = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`${base} ${REQUEST_TONE[status]}`}>{REQUEST_STATUS_LABEL[status]}</span>;
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <span className={`${base} ${QUOTE_TONE[status]}`}>{QUOTE_STATUS_LABEL[status]}</span>;
}
