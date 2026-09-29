import type { Session } from '@supabase/supabase-js';
import { getCurrentProfile, type Profile } from '@helphome/shared';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from './api';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const p = await getCurrentProfile(supabase).catch(() => null);
    setProfile(p);
    // Prestador com CNPJ ainda não verificado: tenta confirmar na Receita.
    if (p?.role === 'provider' && !p.cnpj_verified) {
      apiFetch<{ verified: boolean }>('/api/app/cnpj', { method: 'POST' })
        .then(async (r) => {
          if (r.verified) setProfile(await getCurrentProfile(supabase));
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await refreshProfile();
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) void refreshProfile();
      else setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, [refreshProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
