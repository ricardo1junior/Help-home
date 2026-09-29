import { NextResponse, type NextRequest } from "next/server";

// Converte um endereço em coordenadas usando o Nominatim (OpenStreetMap).
// Fica no servidor para mandar o User-Agent exigido pela política de uso.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "informe o endereço" }, { status: 400 });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q, format: "json", limit: "1", countrycodes: "br" }).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "HelpHome/0.1 (https://github.com/ricardo1junior/help-home)", "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    const [first] = (await res.json()) as { lat: string; lon: string }[];
    if (!first) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
    return NextResponse.json({ lat: Number(first.lat), lng: Number(first.lon) });
  } catch {
    return NextResponse.json({ error: "serviço de mapas indisponível" }, { status: 502 });
  }
}
