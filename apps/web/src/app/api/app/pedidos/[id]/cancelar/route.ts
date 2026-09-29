import { NextResponse, type NextRequest } from "next/server";
import { setRequestStatus } from "@helphome/shared";
import { userFromBearer } from "@/lib/supabase/bearer";
import { refundIfNeeded } from "@/lib/payments/confirm";

// App: cancela o pedido e, se já estava pago, estorna o cliente.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/app/pedidos/[id]/cancelar">) {
  const { id } = await ctx.params;
  const user = await userFromBearer(request);
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  try {
    await setRequestStatus(user.supabase, id, "cancelled");
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 400 });
  }
  await refundIfNeeded(id);
  return NextResponse.json({ ok: true });
}
