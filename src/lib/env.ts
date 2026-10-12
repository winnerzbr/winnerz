/** Chave pública do Supabase: a nova "publishable" (sb_publishable_...) ou a antiga "anon". */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SUPABASE_ON = Boolean(SUPABASE_URL && SUPABASE_KEY);
