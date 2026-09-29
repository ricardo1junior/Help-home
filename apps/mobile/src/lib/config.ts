// Preencha no arquivo .env (veja .env.example).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
/** Endereço do site do Help Home (usado para pagamento e verificação de CNPJ). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY && API_URL);
