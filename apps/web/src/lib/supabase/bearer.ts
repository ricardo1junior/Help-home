import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@helphome/shared";
import type { NextRequest } from "next/server";
import { supabaseKey, supabaseUrl } from "./env";

/**
 * Cliente do Supabase agindo como o usuário do app (token no cabeçalho
 * Authorization). Assim o RLS continua valendo nas rotas usadas pelo app.
 */
export async function userFromBearer(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return null;
  const profile = await getCurrentProfile(supabase);
  return profile ? { supabase, profile, email: data.user.email } : null;
}
