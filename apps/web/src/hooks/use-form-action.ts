"use client";

import { useActionState, startTransition } from "react";

/**
 * Como useActionState, mas sem limpar o formulário quando o servidor devolve
 * um erro (o React limpa os campos depois de toda ação enviada via `action=`).
 */
export function useFormAction<S>(action: (state: Awaited<S>, formData: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return [state, onSubmit, pending] as const;
}
