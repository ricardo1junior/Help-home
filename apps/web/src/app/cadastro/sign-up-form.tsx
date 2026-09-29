"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { useState } from "react";
import { formatCnpj, type UserRole } from "@helphome/shared";
import { signUpAction } from "@/app/actions";
import { FormError } from "@/components/form-error";

const ROLES: { value: UserRole; title: string; text: string }[] = [
  { value: "client", title: "Preciso de um serviço", text: "Quero contratar profissionais" },
  { value: "provider", title: "Sou prestador", text: "Quero receber pedidos" },
];

export function SignUpForm({ initialRole }: { initialRole: UserRole }) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [cnpj, setCnpj] = useState("");
  const [state, action, pending] = useFormAction(signUpAction, undefined);

  if (state?.ok) {
    return (
      <div className="card mt-6">
        <h2 className="font-semibold">Confira seu e-mail 📬</h2>
        <p className="mt-2 text-sm text-slate-600">
          Enviamos um link de confirmação. Depois de confirmar, é só entrar com seu e-mail e senha.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={action} className="card mt-6 space-y-4">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="label">Como você quer usar o Help Home?</legend>
        {ROLES.map((r) => (
          <label
            key={r.value}
            className={`cursor-pointer rounded-lg border p-3 text-sm ${
              role === r.value ? "border-brand-500 bg-brand-50" : "border-slate-300"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              checked={role === r.value}
              onChange={() => setRole(r.value)}
              className="sr-only"
            />
            <span className="block font-semibold">{r.title}</span>
            <span className="text-slate-600">{r.text}</span>
          </label>
        ))}
      </fieldset>
      {role === "provider" && (
        <div>
          <label className="label" htmlFor="cnpj">CNPJ</label>
          <input
            className="input"
            id="cnpj"
            name="cnpj"
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Para oferecer serviços é preciso ter CNPJ ativo (MEI serve). Conferimos na Receita Federal.
          </p>
        </div>
      )}
      <div>
        <label className="label" htmlFor="full_name">{role === "provider" ? "Seu nome (responsável)" : "Nome completo"}</label>
        <input className="input" id="full_name" name="full_name" autoComplete="name" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Telefone (WhatsApp)</label>
          <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
        </div>
        <div>
          <label className="label" htmlFor="city">Cidade</label>
          <input className="input" id="city" name="city" autoComplete="address-level2" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
      </div>
      <FormError message={state?.error} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Criando conta…" : "Criar conta"}</button>
    </form>
  );
}
