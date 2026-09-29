"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  acceptQuote,
  createReview,
  getCurrentProfile,
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
import { homeFor } from "@/lib/session";

export type FormState = { error?: string; ok?: boolean } | undefined;

const TRANSLATIONS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar. Enviamos um link para sua caixa de entrada.",
  "User already registered": "Já existe uma conta com este e-mail.",
};

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
  const origin = (await headers()).get("origin") ?? "";
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
        role: formData.get("role") === "provider" ? "provider" : "client",
      },
      `${origin}/auth/callback`,
    );
    needsConfirmation = !data.session;
  } catch (err) {
    return { error: toMessage(err) };
  }
  if (needsConfirmation) return { ok: true };
  redirect(formData.get("role") === "provider" ? "/prestador/perfil" : "/pedidos/novo");
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
  await acceptQuote(supabase, quoteId);
  revalidatePath(`/pedidos/${requestId}`);
}

export async function setStatusAction(requestId: string, status: RequestStatus) {
  const { supabase } = await requireUser();
  await setRequestStatus(supabase, requestId, status);
  revalidatePath(`/pedidos/${requestId}`);
}

export async function reviewAction(
  requestId: string,
  providerId: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  try {
    await createReview(supabase, profile.id, providerId, requestId, {
      rating: Number(formData.get("rating") ?? 0),
      comment: String(formData.get("comment") ?? ""),
    });
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(`/pedidos/${requestId}`);
  return { ok: true };
}
