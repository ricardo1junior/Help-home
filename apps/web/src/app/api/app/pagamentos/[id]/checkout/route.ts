import { NextResponse, type NextRequest } from "next/server";
import { userFromBearer } from "@/lib/supabase/bearer";
import { createCheckoutUrl } from "@/lib/payments/checkout";
import { isTestModeAllowed } from "@/lib/payments/gateway";
import { siteUrlFrom } from "@/lib/http/site-url";

// App: cria o checkout do Mercado Pago. Em modo de teste avisa o app para simular.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/app/pagamentos/[id]/checkout">) {
  const { id } = await ctx.params;
  const user = await userFromBearer(request);
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return isTestModeAllowed()
      ? NextResponse.json({ testMode: true })
      : NextResponse.json({ error: "Pagamento não configurado" }, { status: 503 });
  }
  const url = await createCheckoutUrl(user.supabase, user.profile, id, {
    email: user.email,
    siteUrl: siteUrlFrom(request),
    source: "app",
  });
  if (!url) return NextResponse.json({ error: "Pagamento não está pendente" }, { status: 409 });
  return NextResponse.json({ url });
}
