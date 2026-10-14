/**
 * Uso dos planos gratuitos (Supabase, Resend, Vercel), para saber se e quando vale pagar.
 * Com conta, os números vêm da função usage_report (migração 0022, só administração).
 * Na demonstração, números de exemplo calculados do que está neste navegador.
 */
import { getState } from './store';

export interface Usage {
  dbBytes: number;
  buckets: { bucket: string; bytes: number; files: number }[];
  users: number; active30d: number; signins24h: number; new7d: number;
  aiMonth: number; month: string;
  games: number; copies: number; journeys: number;
  biggest: { name: string; bytes: number }[];
  demo?: boolean;
}

/** Limites dos planos gratuitos (conferidos em outubro de 2026; podem mudar). */
export const FREE = {
  dbBytes: 500 * 1024 * 1024,
  storageBytes: 1024 * 1024 * 1024,
  mau: 50_000,
  emailsDay: 100,
  emailsMonth: 3000,
  functions: 12,
  functionsUsed: 6,
  authEmailsHour: 30,
};

export async function loadUsage(): Promise<Usage> {
  const s = getState();
  if (s.mode !== 'supabase') {
    const json = (() => { try { return (localStorage.getItem('wz.demo.v1') ?? '').length; } catch { return 0; } })();
    return {
      dbBytes: 9_700_000 + json * 2, buckets: [{ bucket: 'momentos', bytes: 3_400_000, files: 18 }, { bucket: 'avatares', bytes: 240_000, files: 2 }],
      users: 1, active30d: 1, signins24h: 1, new7d: 0, aiMonth: 3, month: new Date().toISOString().slice(0, 7),
      games: Object.keys(s.games).length, copies: s.copies.length, journeys: s.journeys.length, biggest: [], demo: true,
    };
  }
  const { getClient } = await import('./supabaseAdapter');
  const { data, error } = await (await getClient()).rpc('usage_report');
  if (error) throw new Error(/usage_report|schema cache/i.test(error.message) ? 'Falta rodar a migração 0022 no Supabase.' : error.message);
  const j = data as any;
  return {
    dbBytes: j.db_bytes ?? 0, buckets: j.buckets ?? [], users: j.users ?? 0, active30d: j.active_30d ?? 0, signins24h: j.signins_24h ?? 0,
    new7d: j.new_7d ?? 0, aiMonth: j.ai_month ?? 0, month: j.month ?? '', games: j.games ?? 0, copies: j.copies ?? 0, journeys: j.journeys ?? 0,
    biggest: j.biggest ?? [],
  };
}

export const fmtBytes = (n: number) => {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',')} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2).replace('.', ',')} GB`;
};
