import Link from "next/link";
import type { Metadata } from "next";
import {
  formatPrice,
  getProviderCategoryIds,
  getProviderRatings,
  listOpenRequestsForProvider,
  listProviderJobs,
  listProviderQuotes,
} from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { RequestCard } from "@/components/request-card";
import { QuoteStatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Painel do prestador" };

const TABS = [
  { key: "disponiveis", label: "Disponíveis" },
  { key: "orcamentos", label: "Meus orçamentos" },
  { key: "servicos", label: "Meus serviços" },
] as const;

export default async function PrestadorPage({ searchParams }: PageProps<"/prestador">) {
  const { supabase, profile } = await requireProfile("provider");
  const { aba, todas } = await searchParams;
  const tab = TABS.find((t) => t.key === aba)?.key ?? "disponiveis";
  const onlyMyCity = todas !== "1" && Boolean(profile.city);

  const [categoryIds, ratings] = await Promise.all([
    getProviderCategoryIds(supabase, profile.id),
    getProviderRatings(supabase, [profile.id]),
  ]);
  const rating = ratings.get(profile.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Olá, {profile.full_name.split(" ")[0] || "prestador"}!</h1>
          <p className="text-sm text-slate-600">
            {rating ? `★ ${rating.average} em ${rating.total} avaliação(ões)` : "Você ainda não tem avaliações."}
          </p>
        </div>
        <Link href="/prestador/perfil" className="btn-secondary">Editar perfil</Link>
      </div>

      {categoryIds.length === 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Escolha as categorias que você atende no seu{" "}
          <Link href="/prestador/perfil" className="font-semibold underline">perfil</Link> para começar a ver pedidos.
        </div>
      )}

      <nav className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/prestador?aba=${t.key}`}
            className={`flex-1 rounded-lg px-3 py-2 text-center font-medium ${
              tab === t.key ? "bg-white shadow-sm" : "text-slate-600"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 space-y-3">
        {tab === "disponiveis" && (
          <Available providerId={profile.id} city={onlyMyCity ? profile.city! : undefined} supabase={supabase} />
        )}
        {tab === "orcamentos" && <MyQuotes providerId={profile.id} supabase={supabase} />}
        {tab === "servicos" && <MyJobs providerId={profile.id} supabase={supabase} />}
      </div>
    </div>
  );
}

type Supabase = Awaited<ReturnType<typeof requireProfile>>["supabase"];

async function Available({ providerId, city, supabase }: { providerId: string; city?: string; supabase: Supabase }) {
  const requests = await listOpenRequestsForProvider(supabase, providerId, city);
  return (
    <>
      <p className="text-sm text-slate-600">
        {city ? (
          <>Mostrando pedidos em <strong>{city}</strong>. <Link href="/prestador?todas=1" className="text-brand-600">Ver todas as cidades</Link></>
        ) : (
          "Mostrando pedidos de todas as cidades."
        )}
      </p>
      {requests.length === 0 ? (
        <Empty text="Nenhum pedido aberto nas suas categorias agora. Volte mais tarde!" />
      ) : (
        requests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            extra={r.already_quoted ? <span className="font-medium text-green-700">Orçamento enviado</span> : <span className="font-medium text-brand-600">Enviar orçamento →</span>}
          />
        ))
      )}
    </>
  );
}

async function MyQuotes({ providerId, supabase }: { providerId: string; supabase: Supabase }) {
  const quotes = await listProviderQuotes(supabase, providerId);
  if (quotes.length === 0) return <Empty text="Você ainda não enviou orçamentos." />;
  return quotes.map((q) => (
    <Link key={q.id} href={`/pedidos/${q.request_id}`} className="card flex items-center justify-between gap-3 transition hover:border-brand-500">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{q.request.category.icon} {q.request.category.name} · {q.request.city}</p>
        <p className="truncate font-medium">{q.request.title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-semibold">{formatPrice(q.price_cents)}</span>
        <QuoteStatusBadge status={q.status} />
      </div>
    </Link>
  ));
}

async function MyJobs({ providerId, supabase }: { providerId: string; supabase: Supabase }) {
  const jobs = await listProviderJobs(supabase, providerId);
  if (jobs.length === 0) return <Empty text="Quando um cliente aceitar seu orçamento, o serviço aparece aqui." />;
  return jobs.map((r) => <RequestCard key={r.id} request={r} />);
}

function Empty({ text }: { text: string }) {
  return <div className="card text-center text-sm text-slate-600">{text}</div>;
}
