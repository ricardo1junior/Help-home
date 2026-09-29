"use client";

import { useTransition } from "react";

export function ActionButton({
  action,
  className,
  confirm,
  children,
}: {
  action: () => Promise<string | void>;
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
          const error = await action();
          if (error) window.alert(error);
        });
      }}
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}
