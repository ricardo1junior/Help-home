"use client";

import { useActionState, useState } from "react";
import { reviewAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

export function ReviewForm({ requestId, providerId }: { requestId: string; providerId: string }) {
  const [rating, setRating] = useState(0);
  const [state, action, pending] = useActionState(reviewAction.bind(null, requestId, providerId), undefined);
  return (
    <form action={action} className="mt-3 space-y-3">
      <p className="text-sm text-slate-600">Como foi o serviço?</p>
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1 text-3xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={n <= rating ? "text-amber-500" : "text-slate-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea className="input min-h-20" name="comment" placeholder="Conte como foi (opcional)" />
      <FormError message={state?.error} />
      <button className="btn-primary" disabled={pending || rating === 0}>
        {pending ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
