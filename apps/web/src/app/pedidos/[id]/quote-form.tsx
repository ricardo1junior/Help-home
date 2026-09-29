"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { MIN_WARRANTY_DAYS } from "@helphome/shared";
import { sendQuoteAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

export function QuoteForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useFormAction(sendQuoteAction.bind(null, requestId), undefined);
  return (
    <form onSubmit={action} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="price">Valor (R$)</label>
          <input className="input" id="price" name="price" inputMode="decimal" placeholder="150,00" required />
        </div>
        <div>
          <label className="label" htmlFor="estimated_hours">Tempo estimado (horas)</label>
          <input className="input" id="estimated_hours" name="estimated_hours" inputMode="decimal" placeholder="2" required />
        </div>
        <div>
          <label className="label" htmlFor="warranty_days">Garantia (dias)</label>
          <input
            className="input"
            id="warranty_days"
            name="warranty_days"
            type="number"
            min={MIN_WARRANTY_DAYS}
            defaultValue={MIN_WARRANTY_DAYS}
            required
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        O prazo conta a partir de quando você inicia o serviço no app. Se passar do tempo estimado, sua nota diminui.
      </p>
      <div>
        <label className="label" htmlFor="message">Mensagem para o cliente</label>
        <textarea
          className="input min-h-20"
          id="message"
          name="message"
          placeholder="O que está incluso, quando pode ir…"
        />
      </div>
      <FormError message={state?.error} />
      <button className="btn-primary" disabled={pending}>{pending ? "Enviando…" : "Enviar orçamento"}</button>
    </form>
  );
}
