"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  acceptQuote,
  createReview,
  createWarrantyClaim,
  getCurrentProfile,
  getPayment,
  isValidCnpj,
  resolveWarrantyClaim,
  parsePriceToCents,
  sendQuote,
  setRequestStatus,
  signIn,
  signOut,
  signUp,
  updateProviderProfile,
  withdrawQuote,
  type RequestStatus,
} from "@helphome/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { homeFor } from "@/lib/session";
import { lookupCnpj } from "@/lib/cnpj-lookup";
import { isTestModeAllowed } from "@/lib/payments/gateway";
import { markPaymentHeld, refundIfNeeded } from "@/lib/payments/confirm";
import { createCheckoutUrl } from "@/lib/payments/checkout";

export type FormState = { error?: string; ok?: boolean } | undefined;

const TRANSLATIONS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar. Enviamos um link para sua caixa de entrada.",
  "User already registered": "Já existe uma conta com este e-mail.",
  "Database error saving new user": "Não foi possível criar a conta. Confira os dados (o CNPJ pode já estar cadastrado).",
};

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

function toMessage(err: unknown): string {
  if (err instanceof ZodError) return err.issues[0]?.message ?? "Dados inválidos.";
  if (err instanceof Error) return TRANSLATIONS[err.message] ?? err.message;
  return "Algo deu errado. Tente novamente.";
}

function safeNext(value: FormDataEntryValue | null): string | null {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

async function requireUser() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/entrar");
  return { supabase, profile };
}

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  try {
    await signIn(supabase, {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (err) {
    return { error: toMessage(err) };
  }
  const profile = await getCurrentProfile(supabase);
  redirect(safeNext(formData.get("next")) ?? (profile ? homeFor(profile) : "/"));
}

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const origin = await siteUrl();
  const isProvider = formData.get("role") === "provider";
  const cnpj = String(formData.get("cnpj") ?? "");

  // Prestador precisa de CNPJ válido e ativo na Receita Federal.
  let lookup: Awaited<ReturnType<typeof lookupCnpj>> | null = null;
  if (isProvider) {
    if (!isValidCnpj(cnpj)) return { error: "Informe um CNPJ válido." };
    lookup = await lookupCnpj(cnpj);
    if (lookup.status === "not_found") return { error: "Este CNPJ não foi encontrado na Receita Federal." };
    if (lookup.status === "inactive") {
      return { error: `Este CNPJ está com situação "${lookup.situation}" na Receita. Só CNPJs ativos podem se cadastrar.` };
    }
  }

  let needsConfirmation = false;
  try {
    const data = await signUp(
      supabase,
      {
        full_name: String(formData.get("full_name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        city: String(formData.get("city") ?? ""),
        role: isProvider ? "provider" : "client",
        cnpj: isProvider ? cnpj : undefined,
      },
      `${origin}/auth/callback`,
    );
    needsConfirmation = !data.session;
    if (lookup?.status === "active" && data.user && hasAdminKey()) {
      await createAdminClient()
        .from("profiles")
        .update({ company_name: lookup.companyName, cnpj_verified: true })
        .eq("id", data.user.id);
    }
  } catch (err) {
    return { error: toMessage(err) };
  }
  if (needsConfirmation) return { ok: true };
  redirect(isProvider ? "/prestador/perfil" : "/pedidos/novo");
}

export async function signOutAction() {
  const supabase = await createClient();
  await signOut(supabase);
  redirect("/");
}

// ---------------------------------------------------------------------------
// Prestador
// ---------------------------------------------------------------------------

export async function saveProviderProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  try {
    await updateProviderProfile(supabase, profile.id, {
      full_name: String(formData.get("full_name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      city: String(formData.get("city") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      category_ids: formData.getAll("category_ids").map(Number),
      base_lat: formData.get("base_lat") ? Number(formData.get("base_lat")) : null,
      base_lng: formData.get("base_lng") ? Number(formData.get("base_lng")) : null,
      service_radius_km: Number(formData.get("service_radius_km") || 20),
    });
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath("/prestador", "layout");
  return { ok: true };
}

export async function sendQuoteAction(requestId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  const price = parsePriceToCents(String(formData.get("price") ?? ""));
  if (!price) return { error: "Informe um valor válido, por exemplo 150,00." };
  try {
    await sendQuote(supabase, profile.id, requestId, {
      price_cents: price,
      message: String(formData.get("message") ?? ""),
      estimated_hours: Number(String(formData.get("estimated_hours") || "NaN").replace(",", ".")),
      warranty_days: Number(formData.get("warranty_days") || "NaN"),
    });
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(`/pedidos/${requestId}`);
  return { ok: true };
}

export async function withdrawQuoteAction(requestId: string, quoteId: string) {
  const { supabase } = await requireUser();
  await withdrawQuote(supabase, quoteId);
  revalidatePath(`/pedidos/${requestId}`);
}

// ---------------------------------------------------------------------------
// Pedido
// ---------------------------------------------------------------------------

export async function acceptQuoteAction(requestId: string, quoteId: string) {
  const { supabase } = await requireUser();
  const paymentId = await acceptQuote(supabase, quoteId);
  revalidatePath(`/pedidos/${requestId}`);
  redirect(`/pagamento/${paymentId}`);
}

export async function setStatusAction(requestId: string, status: RequestStatus): Promise<string | void> {
  const { supabase } = await requireUser();
  try {
    await setRequestStatus(supabase, requestId, status);
  } catch (err) {
    return toMessage(err);
  }
  if (status === "cancelled") await refundIfNeeded(requestId);
  revalidatePath(`/pedidos/${requestId}`);
}

// ---------------------------------------------------------------------------
// Pagamento
// ---------------------------------------------------------------------------

export async function startCheckoutAction(paymentId: string) {
  const { supabase, profile } = await requireUser();
  const { data } = await supabase.auth.getUser();
  const url = await createCheckoutUrl(supabase, profile, paymentId, {
    email: data.user?.email,
    siteUrl: await siteUrl(),
    source: "web",
  });
  redirect(url ?? "/pedidos");
}

/** Aprova um pagamento no modo de teste (só funciona sem o Mercado Pago configurado). */
export async function simulateApproveAction(paymentId: string) {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN || !isTestModeAllowed()) throw new Error("Modo de teste desativado");
  const { supabase, profile } = await requireUser();
  const payment = await getPayment(supabase, paymentId);
  if (!payment || payment.client_id !== profile.id) redirect("/pedidos");
  if (payment.status === "pending") {
    await markPaymentHeld(payment.id, "simulado", `sim_${Date.now()}`, "pix");
  }
  redirect(`/pedidos/${payment.request_id}`);
}

// ---------------------------------------------------------------------------
// Garantia e avaliações
// ---------------------------------------------------------------------------

export async function warrantyClaimAction(requestId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  try {
    await createWarrantyClaim(supabase, profile.id, requestId, {
      description: String(formData.get("description") ?? ""),
    });
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(`/pedidos/${requestId}`);
  return { ok: true };
}

export async function resolveClaimAction(requestId: string, claimId: string) {
  const { supabase } = await requireUser();
  await resolveWarrantyClaim(supabase, claimId);
  revalidatePath(`/pedidos/${requestId}`);
}

export async function reviewAction(
  requestId: string,
  revieweeId: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  const rating = String(formData.get("rating") ?? "");
  if (rating === "") return { error: "Escolha uma nota de 0 a 5." };
  try {
    await createReview(supabase, profile.id, revieweeId, requestId, {
      rating: Number(rating),
      comment: String(formData.get("comment") ?? ""),
    });
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(`/pedidos/${requestId}`);
  return { ok: true };
}
