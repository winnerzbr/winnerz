/** Chave pública do Supabase: a nova "publishable" (sb_publishable_...) ou a antiga "anon". */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SUPABASE_ON = Boolean(SUPABASE_URL && SUPABASE_KEY);
/** Site fechado: só a conta de administrador vê o conteúdo; os demais veem "Em breve". Para abrir, VITE_SITE_PRIVATE=0 na Vercel. */
export const SITE_PRIVATE: boolean = (import.meta.env.VITE_SITE_PRIVATE ?? '1') !== '0';
