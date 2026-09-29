import Link from "next/link";
import { formatDate, type ServiceRequestWithCategory } from "@helphome/shared";
import { RequestStatusBadge } from "./status-badge";

export function RequestCard({
  request,
  extra,
}: {
  request: ServiceRequestWithCategory;
  extra?: React.ReactNode;
}) {
  return (
    <Link href={`/pedidos/${request.id}`} className="card block transition hover:border-brand-500">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {request.category.icon} {request.category.name} · {request.city}
          </p>
          <h3 className="mt-1 truncate font-semibold">{request.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{request.description}</p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Publicado em {formatDate(request.created_at)}</span>
        {extra}
      </div>
    </Link>
  );
}
