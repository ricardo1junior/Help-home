export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`text-amber-500 ${className}`} aria-label={`${value} de 5 estrelas`}>
      {"★".repeat(full)}
      <span className="text-slate-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function RatingSummary({
  average,
  total,
  lateJobs = 0,
}: {
  average: number | null;
  total: number;
  lateJobs?: number;
}) {
  if (!total && !lateJobs) return <span className="text-slate-500">Novo no Help Home</span>;
  return (
    <span className="text-slate-600">
      ★ {average?.toFixed(1)}
      {total ? ` (${total} avaliaç${total === 1 ? "ão" : "ões"})` : ""}
      {lateJobs > 0 && <span className="text-red-600"> · {lateJobs} fora do prazo</span>}
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">CNPJ verificado</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">CNPJ informado</span>
  );
}
