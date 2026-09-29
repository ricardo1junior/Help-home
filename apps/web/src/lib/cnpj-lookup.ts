import { onlyDigits } from "@helphome/shared";

export type CnpjLookup =
  | { status: "active"; companyName: string }
  | { status: "inactive"; companyName: string; situation: string }
  | { status: "not_found" }
  | { status: "unavailable" };

/** Consulta o CNPJ na Receita Federal pela BrasilAPI (gratuita, sem chave). */
export async function lookupCnpj(cnpj: string): Promise<CnpjLookup> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${onlyDigits(cnpj)}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 400) return { status: "not_found" };
    if (!res.ok) return { status: "unavailable" };
    const data = (await res.json()) as {
      razao_social?: string;
      nome_fantasia?: string;
      descricao_situacao_cadastral?: string;
    };
    const companyName = data.nome_fantasia || data.razao_social || "";
    const situation = (data.descricao_situacao_cadastral ?? "").toUpperCase();
    return situation === "ATIVA"
      ? { status: "active", companyName }
      : { status: "inactive", companyName, situation: situation || "desconhecida" };
  } catch {
    return { status: "unavailable" };
  }
}
