/**
 * Radar: acompanhamento de lançamentos (não é posse nem desejo).
 * As datas vêm do IGDB com a precisão real (dia, mês, trimestre, ano ou sem data)
 * e ficam guardadas por 12 horas neste navegador.
 */
import { localDay } from './dates';

export type RadarInfo = {
  status: 'sem-data' | 'previsto' | 'acesso-antecipado' | 'lancado' | 'cancelado';
  label: string;
  day?: string;
  sort?: string;
  precision: 'dia' | 'mes' | 'trimestre' | 'ano' | 'sem-data';
  platforms: string[];
  recent?: boolean;
  next?: string;
};

const KEY = 'wz.radar.v1';
const TTL = 12 * 3600 * 1000;
type Cache = Record<string, { at: number; info: RadarInfo | null }>;

function read(): Cache { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } }
function write(c: Cache) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* sem armazenamento: busca de novo */ } }

/** Datas do Radar por número do IGDB. O que falhar fica de fora (sem inventar data). */
export async function loadRadar(igdbIds: number[]): Promise<Record<number, RadarInfo>> {
  const cache = read(), now = Date.now();
  const out: Record<number, RadarInfo> = {};
  const need: number[] = [];
  for (const id of [...new Set(igdbIds)]) {
    const c = cache[id];
    if (c && now - c.at < TTL) { if (c.info) out[id] = c.info; } else need.push(id);
  }
  for (let i = 0; i < need.length; i += 100) {
    const batch = need.slice(i, i + 100);
    try {
      const r = await fetch(`/api/igdb?radar=${batch.join(',')}`);
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) continue;
      const got: Record<string, RadarInfo> = await r.json();
      for (const id of batch) { cache[id] = { at: now, info: got[id] ?? null }; if (got[id]) out[id] = got[id]; }
    } catch { /* sem rede: tenta depois */ }
  }
  write(cache);
  return out;
}

/** Dias até a data confirmada (0 = hoje). */
export function daysUntil(day: string, today = localDay()): number {
  return Math.round((Date.parse(day + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000);
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export function whenSoon(day: string, today = localDay()): string {
  const n = daysUntil(day, today);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n > 1 && n < 7) return WEEKDAYS[new Date(day + 'T12:00:00Z').getUTCDay()];
  if (n < 0 && n >= -1) return 'ontem';
  return '';
}
