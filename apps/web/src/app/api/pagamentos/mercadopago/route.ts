import { NextResponse, type NextRequest } from "next/server";
import { isValidMercadoPagoSignature } from "@/lib/payments/mercadopago";
import { syncMercadoPagoPayment } from "@/lib/payments/confirm";

// Notificações (webhook) do Mercado Pago.
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const body = (await request.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
  const type = params.get("type") ?? body.type;
  const dataId = params.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);

  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true });

  if (!isValidMercadoPagoSignature(dataId, request.headers.get("x-signature"), request.headers.get("x-request-id"))) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  try {
    const result = await syncMercadoPagoPayment(dataId);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("Webhook Mercado Pago", err);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }
}
