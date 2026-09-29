import Link from "next/link";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CadastroPage({ searchParams }: PageProps<"/cadastro">) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { tipo } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-600">
        Já tem conta? <Link href="/entrar" className="font-medium text-brand-600">Entrar</Link>
      </p>
      <SignUpForm initialRole={tipo === "prestador" ? "provider" : "client"} />
    </div>
  );
}
