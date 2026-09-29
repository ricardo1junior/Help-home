import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  formatDate,
  formatPrice,
  getProfile,
  getProviderRatings,
  getRequest,
  getReviewForRequest,
  listMessages,
  listQuotes,
} from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { QuoteStatusBadge, RequestStatusBadge } from "@/components/status-badge";
import { ActionButton } from "./action-button";
import { Chat } from "./chat";
import { QuoteForm } from "./quote-form";
import { ReviewForm } from "./review-form";
import { acceptQuoteAction, setStatusAction, withdrawQuoteAction } from "@/app/actions";

export const metadata: Metadata = { title: "Pedido" };

export default async function PedidoPage({ params }: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const request = await getRequest(supabase, id);
  if (!request) notFound();

  const isClient = request.client_id === profile.id;
  const isChosenProvider = request.provider_id === profile.id;
  const canChat = Boolean(request.provider_id) && (isClient || isChosenProvider);

  const [quotes, messages, review, chosenProvider] = await Promise.all([
    listQuotes(supabase, id),
    canChat ? listMessages(supabase, id) : Promise.resolve([]),
    request.status === "completed" ? getReviewForRequest(supabase, id) : Promise.resolve(null),
    request.provider_id ? getProfile(supabase, request.provider_id) : Promise.resolve(null),
  ]);
  const ratings = await getProviderRatings(supabase, quotes.map((q) => q.provider_id));
  const myQuote = quotes.find((q) => q.provider_id === profile.id);
  const client = isChosenProvider ? await getProfile(supabase, request.client_id) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-slate-500">
            {request.category.icon} {request.category.name}
          </p>
          <RequestStatusBadge status={request.status} />
        </div>
        <h1 className="mt-2 text-2xl font-bold">{request.title}</h1>
        <p className="mt-3 whitespace-pre-line text-slate-700">{request.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Local</dt>
            {/* O endereço completo só aparece para o cliente e para o prestador escolhido. */}
            <dd className="font-medium">{isClient || isChosenProvider ? `${request.address}, ${request.city}` : request.city}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Data preferida</dt>
            <dd className="font-medium">{request.preferred_date ? formatDate(request.preferred_date) : "A combinar"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Publicado em</dt>
            <dd className="font-medium">{formatDate(request.created_at)}</dd>
          </div>
        </dl>
        {request.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {request.photos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Foto do problema" className="aspect-square w-full rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}
        {isClient && ["open", "assigned"].includes(request.status) && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <ActionButton
              action={setStatusAction.bind(null, id, "cancelled")}
              className="btn-danger"
              confirm="Cancelar este pedido?"
            >
              Cancelar pedido
            </ActionButton>
          </div>
        )}
      </section>

      {/* Prestador escolhido */}
      {chosenProvider && (isClient || isChosenProvider) && request.status !== "cancelled" && (
        <section className="card">
          <h2 className="font-semibold">{isClient ? "Profissional escolhido" : "Cliente"}</h2>
          {isClient ? (
            <ContactCard name={chosenProvider.full_name} phone={chosenProvider.phone} city={chosenProvider.city} />
          ) : (
            client && <ContactCard name={client.full_name} phone={client.phone} city={client.city} />
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {isChosenProvider && request.status === "assigned" && (
              <ActionButton action={setStatusAction.bind(null, id, "in_progress")} className="btn-primary">
                Iniciar serviço
              </ActionButton>
            )}
            {["assigned", "in_progress"].includes(request.status) && (
              <ActionButton
                action={setStatusAction.bind(null, id, "completed")}
                className={isChosenProvider && request.status === "assigned" ? "btn-secondary" : "btn-primary"}
                confirm="Confirmar que o serviço foi concluído?"
              >
                Marcar como concluído
              </ActionButton>
            )}
          </div>
        </section>
      )}

      {/* Avaliação */}
      {request.status === "completed" && request.provider_id && (isClient || isChosenProvider) && (
        <section className="card">
          <h2 className="font-semibold">Avaliação</h2>
          {review ? (
            <div className="mt-2">
              <p className="text-lg text-amber-500">{"★".repeat(review.rating)}<span className="text-slate-300">{"★".repeat(5 - review.rating)}</span></p>
              {review.comment && <p className="mt-1 text-sm text-slate-700">“{review.comment}”</p>}
            </div>
          ) : isClient ? (
            <ReviewForm requestId={id} providerId={request.provider_id} />
          ) : (
            <p className="mt-2 text-sm text-slate-600">O cliente ainda não avaliou este serviço.</p>
          )}
        </section>
      )}

      {/* Orçamentos: cliente vê todos, prestador vê o seu */}
      {isClient && (
        <section className="card">
          <h2 className="font-semibold">Orçamentos ({quotes.filter((q) => q.status !== "withdrawn").length})</h2>
          {quotes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              {request.status === "open"
                ? "Ainda não chegaram orçamentos. Avisaremos os profissionais da sua região."
                : "Nenhum orçamento."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {quotes
                .filter((q) => q.status !== "withdrawn")
                .map((q) => {
                  const rating = ratings.get(q.provider_id);
                  return (
                    <li key={q.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {q.provider.full_name}{" "}
                          <span className="text-sm font-normal text-slate-500">
                            {rating ? `★ ${rating.average} (${rating.total})` : "Novo no Help Home"}
                          </span>
                        </p>
                        {q.message && <p className="mt-1 text-sm text-slate-600">{q.message}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{formatPrice(q.price_cents)}</span>
                        {request.status === "open" && q.status === "pending" ? (
                          <ActionButton
                            action={acceptQuoteAction.bind(null, id, q.id)}
                            className="btn-primary"
                            confirm={`Aceitar o orçamento de ${formatPrice(q.price_cents)}?`}
                          >
                            Aceitar
                          </ActionButton>
                        ) : (
                          <QuoteStatusBadge status={q.status} />
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      )}

      {!isClient && (
        <section className="card">
          <h2 className="font-semibold">Seu orçamento</h2>
          {myQuote && myQuote.status !== "withdrawn" ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{formatPrice(myQuote.price_cents)}</p>
                {myQuote.message && <p className="text-sm text-slate-600">{myQuote.message}</p>}
              </div>
              <div className="flex items-center gap-3">
                <QuoteStatusBadge status={myQuote.status} />
                {myQuote.status === "pending" && (
                  <ActionButton
                    action={withdrawQuoteAction.bind(null, id, myQuote.id)}
                    className="btn-secondary"
                    confirm="Retirar seu orçamento?"
                  >
                    Retirar
                  </ActionButton>
                )}
              </div>
            </div>
          ) : request.status === "open" && !myQuote ? (
            <QuoteForm requestId={id} />
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              {myQuote?.status === "withdrawn"
                ? "Você retirou seu orçamento para este pedido."
                : "Este pedido não está mais recebendo orçamentos."}
            </p>
          )}
        </section>
      )}

      {canChat && request.status !== "cancelled" && (
        <Chat requestId={id} userId={profile.id} initialMessages={messages} />
      )}
    </div>
  );
}

function ContactCard({ name, phone, city }: { name: string; phone: string | null; city: string | null }) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return (
    <div className="mt-2 text-sm">
      <p className="font-medium">{name}</p>
      {city && <p className="text-slate-600">{city}</p>}
      {digits && (
        <a
          href={`https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block font-medium text-green-700"
        >
          WhatsApp: {phone}
        </a>
      )}
    </div>
  );
}
