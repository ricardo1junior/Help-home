"use client";

import { useActionState } from "react";
import { sendQuoteAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

export function QuoteForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(sendQuoteAction.bind(null, requestId), undefined);
  return (
    <form action={action} className="mt-3 space-y-3">
      <div>
        <label className="label" htmlFor="price">Valor (R$)</label>
        <input className="input sm:max-w-48" id="price" name="price" inputMode="decimal" placeholder="150,00" required />
      </div>
      <div>
        <label className="label" htmlFor="message">Mensagem para o cliente</label>
        <textarea
          className="input min-h-20"
          id="message"
          name="message"
          placeholder="O que está incluso, prazo, quando pode ir…"
        />
      </div>
      <FormError message={state?.error} />
      <button className="btn-primary" disabled={pending}>{pending ? "Enviando…" : "Enviar orçamento"}</button>
    </form>
  );
}
