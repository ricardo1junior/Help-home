"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { signInAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useFormAction(signInAction, undefined);
  return (
    <form onSubmit={action} className="card mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormError message={state?.error} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
