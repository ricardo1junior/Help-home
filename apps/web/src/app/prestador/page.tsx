import Link from "next/link";
import type { Metadata } from "next";
import {
  formatDistance,
  formatPrice,
  getProviderCategoryIds,
  getProviderRatings,
  listNearbyRequests,
  listOpenRequestsForProvider,
  type LatLng,
  listProviderJobs,
  listProviderQuotes,
} from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { RequestCard } from "@/components/request-card";
import { QuoteStatusBadge } from "@/components/status-badge";
import { NearbyControls } from "./nearby-controls";
import { RequestsMap } from "./requests-map";

export const metadata: Metadata = { title: "Painel do prestador" };

const TABS = [
  { key: "disponiveis", label: "Disponíveis" },
  { key: "orcamentos", label: "Meus orçamentos" },
  { key: "servicos", label: "Meus serviços" },
] as const;

export default async function PrestadorPage({ searchParams }: PageProps<"/prestador">) {
  const { supabase, profile } = await requireProfile("provider");
  const { aba, todas, ver, raio, lat, lng } = await searchParams;
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
            {rating && (rating.total || rating.late_jobs)
              ? `Sua nota: ★ ${rating.average} · ${rating.total} avaliação(ões)${rating.late_jobs ? ` · ${rating.late_jobs} serviço(s) fora do prazo` : ""}`
              : "Você ainda não tem avaliações."}
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
          <Available
            providerId={profile.id}
            city={onlyMyCity ? profile.city! : undefined}
            supabase={supabase}
            view={ver === "mapa" ? "mapa" : "lista"}
            radiusParam={typeof raio === "string" ? raio : String(profile.service_radius_km)}
            current={toLatLng(lat, lng)}
            base={toLatLng(profile.base_lat, profile.base_lng)}
          />
        )}
        {tab === "orcamentos" && <MyQuotes providerId={profile.id} supabase={supabase} />}
        {tab === "servicos" && <MyJobs providerId={profile.id} supabase={supabase} />}
      </div>
    </div>
  );
}

type Supabase = Awaited<ReturnType<typeof requireProfile>>["supabase"];

function toLatLng(lat: unknown, lng: unknown): LatLng | null {
  const a = Number(lat);
  const b = Number(lng);
  return lat != null && lng != null && lat !== "" && Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lng: b } : null;
}

async function Available({
  providerId,
  city,
  supabase,
  view,
  radiusParam,
  current,
  base,
}: {
  providerId: string;
  city?: string;
  supabase: Supabase;
  view: "lista" | "mapa";
  radiusParam: string;
  current: LatLng | null;
  base: LatLng | null;
}) {
  const origin = current ?? base;
  if (origin) {
    const radiusKm = radiusParam === "todos" ? null : Number(radiusParam) || 20;
    const requests = await listNearbyRequests(supabase, providerId, origin, radiusKm);
    return (
      <>
        <NearbyControls view={view} radius={radiusKm ? String(radiusKm) : "todos"} usingCurrent={Boolean(current)} />
        <p className="text-sm text-slate-600">
          {requests.length} pedido(s) {radiusKm ? `até ${radiusKm} km` : ""} de {current ? "onde você está agora" : "sua base"}, do mais perto para o mais longe.
        </p>
        {view === "mapa" ? (
          <RequestsMap origin={origin} radiusKm={radiusKm} requests={requests} />
        ) : requests.length === 0 ? (
          <Empty text="Nenhum pedido aberto nessa distância. Tente aumentar o raio." />
        ) : (
          requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              extra={
                <span className="flex items-center gap-3">
                  {r.distance_km != null && <span className="font-medium text-slate-700">📍 a {formatDistance(r.distance_km)}</span>}
                  {r.already_quoted ? (
                    <span className="font-medium text-green-700">Orçamento enviado</span>
                  ) : (
                    <span className="font-medium text-brand-600">Enviar orçamento →</span>
                  )}
                </span>
              }
            />
          ))
        )}
      </>
    );
  }

  // Sem base definida: lista por cidade, como antes.
  const requests = await listOpenRequestsForProvider(supabase, providerId, city);
  return (
    <>
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
        📍 <Link href="/prestador/perfil" className="font-semibold text-brand-700 underline">Marque sua base no mapa</Link> para ver os
        pedidos mais próximos e usar o mapa.
      </div>
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
