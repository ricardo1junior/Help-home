import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  deadlineFrom,
  formatDate,
  formatDateTime,
  formatHours,
  formatPrice,
  getClientRating,
  getPaymentForRequest,
  getProfile,
  getProviderRatings,
  getRequest,
  listMessages,
  listQuotes,
  listReviewsForRequest,
  listServicePhotos,
  listWarrantyClaims,
  CLAIM_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type RequestStatus,
} from "@helphome/shared";
import { requireProfile } from "@/lib/session";
import { QuoteStatusBadge, RequestStatusBadge } from "@/components/status-badge";
import { RatingSummary, Stars, VerifiedBadge } from "@/components/stars";
import { acceptQuoteAction, resolveClaimAction, setStatusAction, withdrawQuoteAction } from "@/app/actions";
import { ActionButton } from "./action-button";
import { Chat } from "./chat";
import { QuoteForm } from "./quote-form";
import { ReviewForm } from "./review-form";
import { ServicePhotos } from "./service-photos";
import { WarrantyForm } from "./warranty-form";

export const metadata: Metadata = { title: "Pedido" };

const STEPS: { status: RequestStatus; label: string }[] = [
  { status: "open", label: "Orçamentos" },
  { status: "awaiting_payment", label: "Pagamento" },
  { status: "assigned", label: "Agendado" },
  { status: "in_progress", label: "Em andamento" },
  { status: "awaiting_confirmation", label: "Confirmação" },
  { status: "completed", label: "Concluído" },
];

export default async function PedidoPage({ params }: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const request = await getRequest(supabase, id);
  if (!request) notFound();

  const isClient = request.client_id === profile.id;
  const isChosenProvider = request.provider_id === profile.id;
  const isParty = isClient || isChosenProvider;
  const paid = ["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(request.status);

  const [quotes, messages, reviews, photos, claims, payment, otherParty, clientRating] = await Promise.all([
    listQuotes(supabase, id),
    isParty && request.provider_id ? listMessages(supabase, id) : Promise.resolve([]),
    request.status === "completed" && isParty ? listReviewsForRequest(supabase, id) : Promise.resolve([]),
    isParty && paid ? listServicePhotos(supabase, id) : Promise.resolve([]),
    request.status === "completed" && isParty ? listWarrantyClaims(supabase, id) : Promise.resolve([]),
    isParty && request.provider_id ? getPaymentForRequest(supabase, id) : Promise.resolve(null),
    isClient && request.provider_id
      ? getProfile(supabase, request.provider_id)
      : isChosenProvider
        ? getProfile(supabase, request.client_id)
        : Promise.resolve(null),
    isClient ? Promise.resolve(null) : getClientRating(supabase, request.client_id),
  ]);
  const ratings = await getProviderRatings(supabase, quotes.map((q) => q.provider_id));
  const myQuote = quotes.find((q) => q.provider_id === profile.id);
  const acceptedQuote = quotes.find((q) => q.status === "accepted");
  const myReview = reviews.find((r) => r.reviewer_id === profile.id);
  const reviewOfMe = reviews.find((r) => r.reviewee_id === profile.id);
  const deadline =
    request.started_at && acceptedQuote ? deadlineFrom(request.started_at, acceptedQuote.estimated_hours) : null;
  const finishedOrNow = request.finished_at ? new Date(request.finished_at) : new Date();
  const isLate = deadline ? finishedOrNow > deadline : false;
  const warrantyActive = request.warranty_until ? new Date(`${request.warranty_until}T23:59:59`) >= new Date() : false;
  const currentStep = STEPS.findIndex((s) => s.status === request.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      {request.status !== "cancelled" && (
        <ol className="flex gap-1 overflow-x-auto text-[11px] font-medium" aria-label="Etapas do pedido">
          {STEPS.map((s, i) => (
            <li
              key={s.status}
              className={`flex-1 whitespace-nowrap rounded-full px-2 py-1 text-center ${
                i < currentStep ? "bg-brand-100 text-brand-700" : i === currentStep ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {s.label}
            </li>
          ))}
        </ol>
      )}

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
            <dd className="font-medium">{isParty ? `${request.address}, ${request.city}` : request.city}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Data preferida</dt>
            <dd className="font-medium">{request.preferred_date ? formatDate(request.preferred_date) : "A combinar"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{isClient ? "Publicado em" : "Cliente"}</dt>
            <dd className="font-medium">
              {isClient ? (
                formatDate(request.created_at)
              ) : (
                <RatingSummary average={clientRating?.average ?? null} total={clientRating?.total ?? 0} />
              )}
            </dd>
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
        {isClient && ["open", "awaiting_payment", "assigned"].includes(request.status) && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <ActionButton
              action={setStatusAction.bind(null, id, "cancelled")}
              className="btn-danger"
              confirm={
                request.status === "assigned"
                  ? "Cancelar este pedido? O valor pago será estornado."
                  : "Cancelar este pedido?"
              }
            >
              {request.status === "assigned" ? "Cancelar e pedir estorno" : "Cancelar pedido"}
            </ActionButton>
          </div>
        )}
      </section>

      {/* Pagamento */}
      {request.status === "awaiting_payment" && isParty && (
        <section className="card border-brand-500">
          {isClient ? (
            <>
              <h2 className="font-semibold">Falta pagar para confirmar o serviço</h2>
              <p className="mt-1 text-sm text-slate-600">
                O valor fica retido com o Help Home e só vai para o prestador quando você confirmar que o serviço foi feito.
              </p>
              {payment && <Link href={`/pagamento/${payment.id}`} className="btn-primary mt-4">Pagar {formatPrice(payment.amount_cents)}</Link>}
            </>
          ) : (
            <>
              <h2 className="font-semibold">Seu orçamento foi aceito! 🎉</h2>
              <p className="mt-1 text-sm text-slate-600">Aguardando o cliente pagar pelo app para você iniciar o serviço.</p>
            </>
          )}
        </section>
      )}

      {payment && payment.status !== "pending" && isParty && (
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Pagamento</h2>
            <span className="text-sm font-medium text-green-700">{PAYMENT_STATUS_LABEL[payment.status]}</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatPrice(payment.amount_cents)}</p>
          {isChosenProvider && (
            <p className="text-sm text-slate-600">
              Você recebe {formatPrice(payment.provider_amount_cents)} (taxa Help Home de {formatPrice(payment.platform_fee_cents)}),
              liberado quando o cliente confirmar o serviço.
            </p>
          )}
          {payment.paid_at && <p className="mt-1 text-xs text-slate-500">Pago em {formatDateTime(payment.paid_at)}</p>}
        </section>
      )}

      {/* Serviço: contato, prazo e ações */}
      {paid && otherParty && isParty && (
        <section className="card">
          <h2 className="font-semibold">{isClient ? "Profissional" : "Cliente"}</h2>
          <ContactCard
            name={otherParty.company_name || otherParty.full_name}
            detail={isClient && otherParty.company_name ? otherParty.full_name : null}
            phone={otherParty.phone}
            city={otherParty.city}
            verified={isClient ? otherParty.cnpj_verified : null}
          />
          {acceptedQuote && (
            <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Tempo estimado</dt>
                <dd className="font-medium">{formatHours(acceptedQuote.estimated_hours)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{request.started_at ? "Prazo final" : "Início"}</dt>
                <dd className={`font-medium ${isLate ? "text-red-600" : ""}`}>
                  {deadline ? formatDateTime(deadline.toISOString()) : "Ainda não iniciado"}
                  {isLate && " · atrasado"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Garantia</dt>
                <dd className="font-medium">
                  {request.warranty_until ? `até ${formatDate(request.warranty_until)}` : `${acceptedQuote.warranty_days} dias após a conclusão`}
                </dd>
              </div>
            </dl>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {isChosenProvider && request.status === "assigned" && (
              <ActionButton action={setStatusAction.bind(null, id, "in_progress")} className="btn-primary">
                Iniciar serviço (começa a contar o prazo)
              </ActionButton>
            )}
            {isChosenProvider && request.status === "in_progress" && (
              <ActionButton
                action={setStatusAction.bind(null, id, "awaiting_confirmation")}
                className="btn-primary"
                confirm="Finalizar o serviço? O cliente vai confirmar para liberar o pagamento."
              >
                Finalizar serviço
              </ActionButton>
            )}
            {isClient && request.status === "awaiting_confirmation" && (
              <ActionButton
                action={setStatusAction.bind(null, id, "completed")}
                className="btn-primary"
                confirm="Confirmar que o serviço foi feito? O pagamento será liberado ao prestador."
              >
                Confirmar serviço e liberar pagamento
              </ActionButton>
            )}
          </div>
          {isChosenProvider && request.status === "assigned" && (
            <p className="mt-2 text-xs text-slate-500">Envie pelo menos uma foto de antes para iniciar.</p>
          )}
          {isChosenProvider && request.status === "in_progress" && (
            <p className="mt-2 text-xs text-slate-500">Envie pelo menos uma foto de depois para finalizar.</p>
          )}
        </section>
      )}

      {paid && isParty && (
        <section className="card">
          <h2 className="font-semibold">Fotos de antes e depois</h2>
          <ServicePhotos
            requestId={id}
            userId={profile.id}
            photos={photos}
            canUpload={isChosenProvider && ["assigned", "in_progress", "awaiting_confirmation"].includes(request.status)}
          />
        </section>
      )}

      {/* Garantia */}
      {request.status === "completed" && isParty && (
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Garantia</h2>
            <Link href={`/pedidos/${id}/comprovante`} className="text-sm font-medium text-brand-700">Ver comprovante →</Link>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {warrantyActive ? `Serviço garantido até ${formatDate(request.warranty_until!)}.` : `Garantia encerrada em ${formatDate(request.warranty_until!)}.`}
          </p>
          {claims.length > 0 && (
            <ul className="mt-3 space-y-2">
              {claims.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">{formatDateTime(c.created_at)}</span>
                    <span className={`text-xs font-medium ${c.status === "open" ? "text-amber-700" : "text-green-700"}`}>
                      {CLAIM_STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <p className="mt-1">{c.description}</p>
                  {isChosenProvider && c.status === "open" && (
                    <ActionButton action={resolveClaimAction.bind(null, id, c.id)} className="btn-secondary mt-2" confirm="Marcar como resolvido?">
                      Marcar como resolvido
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isClient && warrantyActive && <WarrantyForm requestId={id} />}
        </section>
      )}

      {/* Avaliações nos dois sentidos */}
      {request.status === "completed" && isParty && otherParty && (
        <section className="card">
          <h2 className="font-semibold">Avaliações</h2>
          {myReview ? (
            <div className="mt-2 text-sm">
              <p className="text-slate-500">Sua avaliação</p>
              <Stars value={myReview.rating} className="text-lg" />
              {myReview.comment && <p className="text-slate-700">“{myReview.comment}”</p>}
            </div>
          ) : (
            <ReviewForm
              requestId={id}
              revieweeId={otherParty.id}
              revieweeName={isClient ? otherParty.company_name || otherParty.full_name : otherParty.full_name}
            />
          )}
          {reviewOfMe && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
              <p className="text-slate-500">Avaliação que você recebeu</p>
              <Stars value={reviewOfMe.rating} className="text-lg" />
              {reviewOfMe.comment && <p className="text-slate-700">“{reviewOfMe.comment}”</p>}
            </div>
          )}
        </section>
      )}

      {/* Orçamentos: cliente vê todos, prestador vê o seu */}
      {isClient && (request.status === "open" || quotes.length > 0) && (
        <section className="card">
          <h2 className="font-semibold">Orçamentos ({quotes.filter((q) => q.status !== "withdrawn").length})</h2>
          {quotes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Ainda não chegaram orçamentos. Os profissionais da sua região já podem ver seu pedido.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {quotes
                .filter((q) => q.status !== "withdrawn")
                .map((q) => {
                  const rating = ratings.get(q.provider_id);
                  return (
                    <li key={q.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {q.provider.company_name || q.provider.full_name}
                          <VerifiedBadge verified={q.provider.cnpj_verified} />
                        </p>
                        <p className="text-sm">
                          <RatingSummary average={rating?.average ?? null} total={rating?.total ?? 0} lateJobs={rating?.late_jobs} />
                        </p>
                        <p className="text-xs text-slate-500">
                          Leva cerca de {formatHours(q.estimated_hours)} · garantia de {q.warranty_days} dias
                        </p>
                        {q.message && <p className="text-sm text-slate-600">{q.message}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{formatPrice(q.price_cents)}</span>
                        {request.status === "open" && q.status === "pending" ? (
                          <ActionButton
                            action={acceptQuoteAction.bind(null, id, q.id)}
                            className="btn-primary"
                            confirm={`Aceitar o orçamento de ${formatPrice(q.price_cents)} e seguir para o pagamento?`}
                          >
                            Aceitar e pagar
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
                <p className="text-xs text-slate-500">
                  {formatHours(myQuote.estimated_hours)} · garantia de {myQuote.warranty_days} dias
                </p>
                {myQuote.message && <p className="text-sm text-slate-600">{myQuote.message}</p>}
              </div>
              <div className="flex items-center gap-3">
                <QuoteStatusBadge status={myQuote.status} />
                {myQuote.status === "pending" && request.status === "open" && (
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

      {isParty && request.provider_id && request.status !== "cancelled" && (
        <Chat requestId={id} userId={profile.id} initialMessages={messages} />
      )}
    </div>
  );
}

function ContactCard({
  name,
  detail,
  phone,
  city,
  verified,
}: {
  name: string;
  detail: string | null;
  phone: string | null;
  city: string | null;
  verified: boolean | null;
}) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return (
    <div className="mt-2 text-sm">
      <p className="flex flex-wrap items-center gap-2 font-medium">
        {name} {verified !== null && <VerifiedBadge verified={verified} />}
      </p>
      {detail && <p className="text-slate-600">{detail}</p>}
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
