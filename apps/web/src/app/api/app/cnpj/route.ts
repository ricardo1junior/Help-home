import { NextResponse, type NextRequest } from "next/server";
import { isValidCnpj } from "@helphome/shared";
import { lookupCnpj } from "@/lib/cnpj-lookup";
import { userFromBearer } from "@/lib/supabase/bearer";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

// Rotas de CNPJ usadas pelo app.

/** Consulta antes do cadastro: diz se o CNPJ pode ser usado. */
export async function GET(request: NextRequest) {
  const cnpj = request.nextUrl.searchParams.get("cnpj") ?? "";
  if (!isValidCnpj(cnpj)) return NextResponse.json({ ok: false, error: "Informe um CNPJ válido." });
  const lookup = await lookupCnpj(cnpj);
  if (lookup.status === "not_found") {
    return NextResponse.json({ ok: false, error: "Este CNPJ não foi encontrado na Receita Federal." });
  }
  if (lookup.status === "inactive") {
    return NextResponse.json({
      ok: false,
      error: `Este CNPJ está com situação "${lookup.situation}" na Receita. Só CNPJs ativos podem se cadastrar.`,
    });
  }
  return NextResponse.json({ ok: true });
}

/** Depois do cadastro/login: marca o CNPJ do prestador como verificado. */
export async function POST(request: NextRequest) {
  const user = await userFromBearer(request);
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { profile } = user;
  if (profile.role !== "provider" || !profile.cnpj || profile.cnpj_verified || !hasAdminKey()) {
    return NextResponse.json({ verified: profile.cnpj_verified });
  }
  const lookup = await lookupCnpj(profile.cnpj);
  if (lookup.status !== "active") return NextResponse.json({ verified: false });
  await createAdminClient()
    .from("profiles")
    .update({ company_name: lookup.companyName, cnpj_verified: true })
    .eq("id", profile.id);
  return NextResponse.json({ verified: true });
}
