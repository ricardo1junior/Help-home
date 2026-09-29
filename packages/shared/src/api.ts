/**
 * Acesso a dados do Help Home. Todas as funções recebem o cliente do Supabase,
 * então o mesmo código roda no site (Next.js) e no app (Expo).
 * As regras de quem pode ver ou alterar o quê ficam no banco (RLS).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTOS_BUCKET } from "./constants";
import {
  newRequestSchema,
  providerProfileSchema,
  quoteSchema,
  reviewSchema,
  signInSchema,
  signUpSchema,
  type NewRequestInput,
  type ProviderProfileInput,
  type QuoteInput,
  type ReviewInput,
  type SignInInput,
  type SignUpInput,
  type WarrantyClaimInput,
  warrantyClaimSchema,
} from "./schemas";
import type {
  Category,
  ClientRating,
  Payment,
  PhotoKind,
  ServicePhoto,
  WarrantyClaim,
  Message,
  Profile,
  ProviderRating,
  Quote,
  QuoteWithProvider,
  RequestStatus,
  Review,
  ServiceRequestDetail,
  ServiceRequestWithCategory,
} from "./types";

type Client = SupabaseClient;

function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

const REQUEST_WITH_CATEGORY = "*, category:categories(*)";
const PUBLIC_PROFILE = "id, full_name, city, company_name, cnpj_verified";
const REQUEST_DETAIL = `*, category:categories(*), client:profiles!service_requests_client_id_fkey(${PUBLIC_PROFILE}), provider:profiles!service_requests_provider_id_fkey(${PUBLIC_PROFILE})`;

// ---------------------------------------------------------------------------
// Autenticação e perfil
// ---------------------------------------------------------------------------

export async function signUp(sb: Client, input: SignUpInput, emailRedirectTo?: string) {
  const { email, password, ...meta } = signUpSchema.parse(input);
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: meta, emailRedirectTo },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signIn(sb: Client, input: SignInInput) {
  const { email, password } = signInSchema.parse(input);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut(sb: Client) {
  const { error } = await sb.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentProfile(sb: Client): Promise<Profile | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return unwrap<Profile | null>(await sb.from("profiles").select("*").eq("id", user.id).maybeSingle());
}

export async function getProfile(sb: Client, id: string): Promise<Profile | null> {
  return unwrap(await sb.from("profiles").select("*").eq("id", id).maybeSingle());
}

export async function updateProviderProfile(sb: Client, userId: string, input: ProviderProfileInput) {
  const { category_ids, ...profile } = providerProfileSchema.parse(input);
  unwrap(await sb.from("profiles").update(profile).eq("id", userId));

  const current = await getProviderCategoryIds(sb, userId);
  const toAdd = category_ids.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !category_ids.includes(id));
  if (toAdd.length) {
    unwrap(
      await sb
        .from("provider_categories")
        .insert(toAdd.map((category_id) => ({ provider_id: userId, category_id }))),
    );
  }
  if (toRemove.length) {
    unwrap(
      await sb.from("provider_categories").delete().eq("provider_id", userId).in("category_id", toRemove),
    );
  }
}

export async function getProviderCategoryIds(sb: Client, providerId: string): Promise<number[]> {
  const rows = unwrap<{ category_id: number }[]>(
    await sb.from("provider_categories").select("category_id").eq("provider_id", providerId),
  );
  return rows.map((r) => r.category_id);
}

export async function getProviderRatings(sb: Client, providerIds: string[]) {
  if (!providerIds.length) return new Map<string, ProviderRating>();
  const rows = unwrap<ProviderRating[]>(
    await sb.from("provider_ratings").select("*").in("provider_id", providerIds),
  );
  return new Map(rows.map((r) => [r.provider_id, r]));
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export async function listCategories(sb: Client): Promise<Category[]> {
  return unwrap(await sb.from("categories").select("*").order("id"));
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export async function uploadRequestPhoto(
  sb: Client,
  userId: string,
  file: Blob | ArrayBuffer,
  extension: string,
  contentType?: string,
): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await sb.storage.from(PHOTOS_BUCKET).upload(path, file, { contentType });
  if (error) throw new Error(error.message);
  return sb.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function createRequest(
  sb: Client,
  clientId: string,
  input: NewRequestInput,
  photos: string[] = [],
): Promise<{ id: string }> {
  const values = newRequestSchema.parse(input);
  return unwrap(
    await sb
      .from("service_requests")
      .insert({ ...values, client_id: clientId, photos })
      .select("id")
      .single(),
  );
}

export async function listClientRequests(sb: Client, clientId: string): Promise<ServiceRequestWithCategory[]> {
  return unwrap(
    await sb
      .from("service_requests")
      .select(REQUEST_WITH_CATEGORY)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  );
}

/** Pedidos abertos nas categorias que o prestador atende (o filtro é feito pelo RLS). */
export async function listOpenRequestsForProvider(
  sb: Client,
  providerId: string,
  city?: string,
): Promise<(ServiceRequestWithCategory & { already_quoted: boolean })[]> {
  let query = sb
    .from("service_requests")
    .select(`${REQUEST_WITH_CATEGORY}, quotes(provider_id)`)
    .eq("status", "open")
    .neq("client_id", providerId)
    .order("created_at", { ascending: false });
  if (city) query = query.ilike("city", city);
  const rows = unwrap<(ServiceRequestWithCategory & { quotes: { provider_id: string }[] })[]>(await query);
  return rows.map(({ quotes, ...r }) => ({
    ...r,
    already_quoted: quotes.some((q) => q.provider_id === providerId),
  }));
}

/** Serviços em que o prestador foi escolhido. */
export async function listProviderJobs(sb: Client, providerId: string): Promise<ServiceRequestWithCategory[]> {
  return unwrap(
    await sb
      .from("service_requests")
      .select(REQUEST_WITH_CATEGORY)
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false }),
  );
}

export async function getRequest(sb: Client, id: string): Promise<ServiceRequestDetail | null> {
  return unwrap(await sb.from("service_requests").select(REQUEST_DETAIL).eq("id", id).maybeSingle());
}

export async function setRequestStatus(sb: Client, requestId: string, status: RequestStatus) {
  unwrap(await sb.rpc("set_request_status", { p_request_id: requestId, p_status: status }));
}

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export async function listQuotes(sb: Client, requestId: string): Promise<QuoteWithProvider[]> {
  return unwrap(
    await sb
      .from("quotes")
      .select(`*, provider:profiles(${PUBLIC_PROFILE})`)
      .eq("request_id", requestId)
      .order("price_cents"),
  );
}

export async function listProviderQuotes(sb: Client, providerId: string): Promise<(Quote & { request: ServiceRequestWithCategory })[]> {
  return unwrap(
    await sb
      .from("quotes")
      .select(`*, request:service_requests(${REQUEST_WITH_CATEGORY})`)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false }),
  );
}

export async function sendQuote(sb: Client, providerId: string, requestId: string, input: QuoteInput) {
  const values = quoteSchema.parse(input);
  unwrap(await sb.from("quotes").insert({ ...values, provider_id: providerId, request_id: requestId }));
}

export async function withdrawQuote(sb: Client, quoteId: string) {
  unwrap(await sb.from("quotes").update({ status: "withdrawn" }).eq("id", quoteId));
}

/** Aceita o orçamento e devolve o id do pagamento que o cliente precisa fazer. */
export async function acceptQuote(sb: Client, quoteId: string): Promise<string> {
  return unwrap(await sb.rpc("accept_quote", { p_quote_id: quoteId }));
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export async function getPayment(sb: Client, paymentId: string): Promise<Payment | null> {
  return unwrap(await sb.from("payments").select("*").eq("id", paymentId).maybeSingle());
}

export async function getPaymentForRequest(sb: Client, requestId: string): Promise<Payment | null> {
  return unwrap(
    await sb
      .from("payments")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function listMessages(sb: Client, requestId: string): Promise<Message[]> {
  return unwrap(
    await sb.from("messages").select("*").eq("request_id", requestId).order("created_at"),
  );
}

export async function sendMessage(sb: Client, senderId: string, requestId: string, body: string): Promise<Message> {
  return unwrap(
    await sb
      .from("messages")
      .insert({ sender_id: senderId, request_id: requestId, body: body.trim() })
      .select("*")
      .single(),
  );
}

/** Escuta novas mensagens em tempo real. Retorna a função para parar de escutar. */
export function subscribeToMessages(sb: Client, requestId: string, onMessage: (m: Message) => void) {
  const channel = sb
    .channel(`messages:${requestId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Fotos de antes e depois
// ---------------------------------------------------------------------------

export async function listServicePhotos(sb: Client, requestId: string): Promise<ServicePhoto[]> {
  return unwrap(
    await sb.from("service_photos").select("*").eq("request_id", requestId).order("created_at"),
  );
}

export async function addServicePhoto(sb: Client, userId: string, requestId: string, kind: PhotoKind, url: string) {
  unwrap(
    await sb.from("service_photos").insert({ request_id: requestId, uploaded_by: userId, kind, url }),
  );
}

export async function deleteServicePhoto(sb: Client, photoId: string) {
  unwrap(await sb.from("service_photos").delete().eq("id", photoId));
}

// ---------------------------------------------------------------------------
// Garantia
// ---------------------------------------------------------------------------

export async function listWarrantyClaims(sb: Client, requestId: string): Promise<WarrantyClaim[]> {
  return unwrap(
    await sb.from("warranty_claims").select("*").eq("request_id", requestId).order("created_at"),
  );
}

export async function createWarrantyClaim(sb: Client, clientId: string, requestId: string, input: WarrantyClaimInput) {
  const values = warrantyClaimSchema.parse(input);
  unwrap(await sb.from("warranty_claims").insert({ ...values, client_id: clientId, request_id: requestId }));
}

export async function resolveWarrantyClaim(sb: Client, claimId: string) {
  unwrap(
    await sb
      .from("warranty_claims")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", claimId),
  );
}

// ---------------------------------------------------------------------------
// Avaliações (cliente avalia o prestador e o prestador avalia o cliente)
// ---------------------------------------------------------------------------

export async function listReviewsForRequest(sb: Client, requestId: string): Promise<Review[]> {
  return unwrap(await sb.from("reviews").select("*").eq("request_id", requestId));
}

export async function createReview(
  sb: Client,
  reviewerId: string,
  revieweeId: string,
  requestId: string,
  input: ReviewInput,
) {
  const values = reviewSchema.parse(input);
  unwrap(
    await sb
      .from("reviews")
      .insert({ ...values, reviewer_id: reviewerId, reviewee_id: revieweeId, request_id: requestId }),
  );
}

export async function listReviewsAbout(sb: Client, profileId: string): Promise<Review[]> {
  return unwrap(
    await sb
      .from("reviews")
      .select("*")
      .eq("reviewee_id", profileId)
      .order("created_at", { ascending: false }),
  );
}

export async function getClientRating(sb: Client, clientId: string): Promise<ClientRating | null> {
  return unwrap(await sb.from("client_ratings").select("*").eq("client_id", clientId).maybeSingle());
}
