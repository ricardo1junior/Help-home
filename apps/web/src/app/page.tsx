import Link from "next/link";
import { listCategories, type Category } from "@helphome/shared";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const FALLBACK_CATEGORIES: Pick<Category, "slug" | "name" | "icon">[] = [
  { slug: "encanador", name: "Encanador", icon: "🚰" },
  { slug: "eletricista", name: "Eletricista", icon: "💡" },
  { slug: "marceneiro", name: "Marceneiro", icon: "🪚" },
  { slug: "pintor", name: "Pintor", icon: "🎨" },
  { slug: "pedreiro", name: "Pedreiro", icon: "🧱" },
  { slug: "chaveiro", name: "Chaveiro", icon: "🔑" },
  { slug: "montador", name: "Montador de móveis", icon: "🛋️" },
  { slug: "jardineiro", name: "Jardineiro", icon: "🌿" },
];

const STEPS = [
  { title: "Descreva o problema", text: "Conte o que precisa, envie fotos e informe o endereço." },
  { title: "Receba orçamentos", text: "Profissionais da sua região enviam o preço pelo app." },
  { title: "Escolha e combine", text: "Compare, aceite o melhor orçamento e converse pelo chat." },
  { title: "Avalie o serviço", text: "Depois de pronto, sua avaliação ajuda outros clientes." },
];

export default async function Home() {
  const categories = isSupabaseConfigured
    ? await listCategories(await createClient()).catch(() => FALLBACK_CATEGORIES)
    : FALLBACK_CATEGORIES;

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            O profissional certo para cada reparo da sua casa.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Encanador, eletricista, marceneiro e muito mais. Peça, compare orçamentos e resolva sem dor de cabeça.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cadastro" className="btn-primary px-6 py-3 text-base">Pedir um serviço</Link>
            <Link href="/cadastro?tipo=prestador" className="btn-secondary px-6 py-3 text-base">Sou prestador</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold">Serviços</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href="/pedidos/novo"
              className="card flex flex-col items-center gap-2 py-6 text-center transition hover:border-brand-500"
            >
              <span className="text-3xl">{c.icon}</span>
              <span className="text-sm font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold">Como funciona</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="card flex flex-col items-start justify-between gap-4 bg-slate-900 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">É prestador de serviços?</h2>
            <p className="mt-1 text-sm text-slate-300">Cadastre-se grátis e receba pedidos de clientes da sua cidade.</p>
          </div>
          <Link href="/cadastro?tipo=prestador" className="btn-primary">Quero me cadastrar</Link>
        </div>
      </section>
    </>
  );
}
