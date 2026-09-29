import { NextResponse, type NextRequest } from "next/server";
import { getPayment } from "@helphome/shared";
import { userFromBearer } from "@/lib/supabase/bearer";
import { isTestModeAllowed } from "@/lib/payments/gateway";
import { markPaymentHeld } from "@/lib/payments/confirm";

// App: aprova um pagamento no modo de teste (desligado quando o Mercado Pago está configurado).
export async function POST(request: NextRequest, ctx: RouteContext<"/api/app/pagamentos/[id]/simular">) {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN || !isTestModeAllowed()) {
    return NextResponse.json({ error: "Modo de teste desativado" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const user = await userFromBearer(request);
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const payment = await getPayment(user.supabase, id);
  if (!payment || payment.client_id !== user.profile.id) {
    return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
  }
  if (payment.status === "pending") await markPaymentHeld(payment.id, "simulado", `sim_${Date.now()}`, "pix");
  return NextResponse.json({ ok: true });
}
