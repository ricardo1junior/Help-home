import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Cliente com a chave secreta: ignora o RLS. Use só no servidor, para ações que
 * o usuário não pode fazer sozinho (confirmar pagamento, marcar CNPJ verificado).
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY não configurada");
  return createSupabaseClient(supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const hasAdminKey = () => Boolean(process.env.SUPABASE_SECRET_KEY);
