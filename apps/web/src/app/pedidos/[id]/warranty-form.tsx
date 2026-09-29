"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { warrantyClaimAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

export function WarrantyForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useFormAction(warrantyClaimAction.bind(null, requestId), undefined);
  if (state?.ok) {
    return <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Garantia acionada. O prestador foi avisado.</p>;
  }
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium text-brand-700">O problema voltou? Acionar garantia</summary>
      <form onSubmit={action} className="mt-3 space-y-3">
        <textarea
          className="input min-h-20"
          name="description"
          placeholder="Descreva o que aconteceu"
          aria-label="Descrição do problema"
          required
        />
        <FormError message={state?.error} />
        <button className="btn-primary" disabled={pending}>{pending ? "Enviando…" : "Acionar garantia"}</button>
      </form>
    </details>
  );
}
