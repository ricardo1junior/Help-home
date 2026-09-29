import Link from "next/link";
import { getCurrentProfile } from "@helphome/shared";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signOutAction } from "@/app/actions";

export async function Header() {
  const profile = isSupabaseConfigured ? await getCurrentProfile(await createClient()) : null;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">🏠</span>
          Help Home
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {profile ? (
            <>
              {profile.role === "provider" ? (
                <>
                  <Link href="/prestador" className="rounded-lg px-3 py-2 hover:bg-slate-100">Pedidos</Link>
                  <Link href="/prestador/perfil" className="rounded-lg px-3 py-2 hover:bg-slate-100">Meu perfil</Link>
                </>
              ) : (
                <>
                  <Link href="/pedidos" className="rounded-lg px-3 py-2 hover:bg-slate-100">Meus pedidos</Link>
                  <Link href="/pedidos/novo" className="btn-primary hidden sm:inline-flex">Pedir serviço</Link>
                </>
              )}
              <form action={signOutAction}>
                <button className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className="rounded-lg px-3 py-2 hover:bg-slate-100">Entrar</Link>
              <Link href="/cadastro" className="btn-primary">Criar conta</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
