import { redirect } from "next/navigation";
import { getCurrentProfile, type Profile, type UserRole } from "@helphome/shared";
import { createClient } from "@/lib/supabase/server";

/** Carrega o usuário logado ou manda para o login. */
export async function requireProfile(role?: UserRole): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
}> {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/entrar");
  if (role && profile.role !== role) redirect("/painel");
  return { supabase, profile };
}

export function homeFor(profile: Profile) {
  return profile.role === "provider" ? "/prestador" : "/pedidos";
}
