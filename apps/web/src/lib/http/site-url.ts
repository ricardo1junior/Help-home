import type { NextRequest } from "next/server";

export function siteUrlFrom(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).replace(/\/$/, "");
}
