"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  className,
  pendingText,
  children,
}: {
  className: string;
  pendingText: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
