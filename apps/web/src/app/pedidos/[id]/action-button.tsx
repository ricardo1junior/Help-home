"use client";

import { useTransition } from "react";

export function ActionButton({
  action,
  className,
  confirm,
  children,
}: {
  action: () => Promise<void>;
  className: string;
  confirm?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          try {
            await action();
          } catch {
            window.alert("Não foi possível concluir a ação. Atualize a página e tente novamente.");
          }
        });
      }}
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}
