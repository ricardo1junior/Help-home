const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(cents: number): string {
  return brl.format(cents / 100);
}

/** Converte "150,50" ou "150.50" em centavos. Retorna null se inválido. */
export function parsePriceToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const number = Number(normalized);
  if (!normalized || !Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 100);
}

export function formatDate(iso: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Prazo final do serviço a partir do início e da estimativa. */
export function deadlineFrom(startedAt: string, estimatedHours: number): Date {
  return new Date(new Date(startedAt).getTime() + estimatedHours * 3600 * 1000);
}
