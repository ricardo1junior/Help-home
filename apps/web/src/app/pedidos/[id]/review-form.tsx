"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { useState } from "react";
import { reviewAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

export function ReviewForm({
  requestId,
  revieweeId,
  revieweeName,
}: {
  requestId: string;
  revieweeId: string;
  revieweeName: string;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [state, action, pending] = useFormAction(reviewAction.bind(null, requestId, revieweeId), undefined);
  return (
    <form onSubmit={action} className="mt-3 space-y-3">
      <p className="text-sm text-slate-600">Que nota você dá para {revieweeName}? (0 a 5)</p>
      <input type="hidden" name="rating" value={rating ?? ""} />
      <div className="flex items-center gap-1 text-3xl">
        <button
          type="button"
          onClick={() => setRating(0)}
          className={`mr-2 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${
            rating === 0 ? "border-red-500 bg-red-50 text-red-700" : "border-slate-300 text-slate-500"
          }`}
        >
          0
        </button>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={rating !== null && n <= rating ? "text-amber-500" : "text-slate-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea className="input min-h-20" name="comment" placeholder="Conte como foi (opcional)" />
      <FormError message={state?.error} />
      <button className="btn-primary" disabled={pending || rating === null}>
        {pending ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
