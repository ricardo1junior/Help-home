import Link from "next/link";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { next, erro } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-slate-600">
        Não tem conta? <Link href="/cadastro" className="font-medium text-brand-600">Cadastre-se</Link>
      </p>
      {erro === "link" && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          O link de confirmação expirou ou é inválido. Entre com seu e-mail e senha.
        </p>
      )}
      <SignInForm next={typeof next === "string" ? next : ""} />
    </div>
  );
}
