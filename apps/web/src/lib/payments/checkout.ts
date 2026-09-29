import { getPayment, getRequest, type Profile } from "@helphome/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGateway } from "./gateway";

/** Cria o checkout de um pagamento pendente do cliente e devolve a URL. */
export async function createCheckoutUrl(
  supabase: SupabaseClient,
  profile: Profile,
  paymentId: string,
  opts: { email?: string; siteUrl: string; source: "web" | "app" },
): Promise<string | null> {
  const payment = await getPayment(supabase, paymentId);
  if (!payment || payment.client_id !== profile.id || payment.status !== "pending") return null;
  const request = await getRequest(supabase, payment.request_id);
  return getGateway().createCheckout({
    payment,
    title: request?.title ?? "Serviço",
    payerEmail: opts.email,
    siteUrl: opts.siteUrl,
    backUrl:
      opts.source === "app"
        ? `${opts.siteUrl}/pagamento/app-retorno`
        : `${opts.siteUrl}/pagamento/${payment.id}/retorno`,
  });
}
