/**
 * Jornada 2 · J2b: o que a linha do tempo mostra sem você ter escrito.
 * Ecos dos amigos (migração 0037, só até o seu progresso), comparação anônima (só a partir de 5 pessoas)
 * e a narração de um capítulo pela IA (pela /api/retomada, que conta no limite mensal).
 * Na demonstração, tudo vem de pessoas e números de exemplo.
 */
import { getState } from './store';
import { DEMO_PEOPLE, demoIsFriend } from './demoPeople';
import type { Compare, Echo, Talk } from '../lib/chapters';

export type EchoFriend = { handle: string; avatar?: string | null; state: 'zerou' | 'jogando' | 'parou' };
export type Echoes = { friends: EchoFriend[]; echoes: Echo[] };
export type AiStatus = { enabled: boolean; used: number; limit: number };
export type ChapterFacts = { game: string; chapter: number; name: string; range: string; summary: string; facts: string[] };

const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const DAY = 86_400_000;

// Ecos de exemplo: um começo, os momentos e o "zerou" de cada amigo da demonstração que jogou o jogo.
const DEMO_STEPS: Record<string, { p: number; title: string; legend?: string }[]> = {
  tlou2: [
    { p: 12, title: 'A patrulha na neve', legend: 'Fui devagar só para olhar a paisagem.' },
    { p: 34, title: 'A loja de discos', legend: 'Fiquei uns dez minutos no violão.' },
    { p: 58, title: 'O teatro', legend: 'Precisei de uma pausa depois dessa parte.' },
  ],
};

function demoEchoes(gameId: string, upto: number | null): Echoes {
  const friends = DEMO_PEOPLE.filter((p) => demoIsFriend(p) && (p.playing.includes(gameId) || p.done.includes(gameId)));
  const out: Echo[] = [];
  if (upto != null) {
    for (const p of friends) {
      out.push({ id: `${p.id}-inicio`, handle: p.handle, kind: 'inicio', at: new Date(Date.now() - 200 * DAY).toISOString(), title: 'Começou a jogar', progress: 0 });
      (DEMO_STEPS[gameId] ?? p.moments.filter((m) => m.game === gameId).map((m) => ({ p: 30, title: m.title, legend: undefined as string | undefined })))
        .forEach((m, i) => out.push({ id: `${p.id}-m${i}`, handle: p.handle, kind: 'momento', at: new Date(Date.now() - (180 - i * 20) * DAY).toISOString(), title: m.title, legend: m.legend, progress: m.p }));
      if (p.done.includes(gameId)) out.push({ id: `${p.id}-zerou`, handle: p.handle, kind: 'marco', at: new Date(Date.now() - 100 * DAY).toISOString(), title: 'Zerou', progress: 100 });
    }
  }
  return {
    friends: friends.map((p) => ({ handle: p.handle, state: p.done.includes(gameId) ? 'zerou' : 'jogando' })),
    echoes: out.filter((e) => upto != null && e.progress <= upto).sort((a, b) => a.progress - b.progress),
  };
}

const DEMO_COMPARE: Compare = { players: 128, enough: true, playing: 9, done: 54, doneSessions: 23, doneHours: 26, paused: 31, pauseBuckets: [{ from: 10, count: 4 }, { from: 30, count: 6 }, { from: 40, count: 12 }, { from: 60, count: 5 }, { from: 80, count: 4 }] };

const DEMO_TALKS: Record<string, Talk[]> = {
  tlou2: [{ id: 'demo-t1', kind: 'postagem', title: 'Alguém mais ficou parado no violão da loja de música?', excerpt: 'Fiquei uns minutos só tocando. Que cena.', at: '2026-10-03T10:00:00-03:00', place: 'Praça', link: '/comunidade', replies: 3 }],
};

export const echoApi = {
  /** O que você escreveu na comunidade sobre o jogo (migração 0051). Sem ela, a linha do tempo segue sem. */
  async talks(gameId: string): Promise<Talk[]> {
    if (!supa()) return DEMO_TALKS[gameId] ?? [];
    const r = await (await client()).rpc('jornada_conversas', { p_game: gameId });
    return r.error ? [] : (r.data as Talk[]);
  },
  async echoes(gameId: string, upto: number | null): Promise<Echoes | null> {
    if (!supa()) return demoEchoes(gameId, upto);
    const r = await (await client()).rpc('jornada_ecos', { p_game: gameId, p_upto: upto });
    if (r.error) return null; // sem a 0037, a linha do tempo segue sem ecos
    return r.data as Echoes;
  },
  async compare(gameId: string): Promise<Compare | null> {
    if (!supa()) return DEMO_COMPARE;
    const r = await (await client()).rpc('jornada_comparacao', { p_game: gameId });
    if (r.error) return null;
    return r.data as Compare | null;
  },
  async aiStatus(): Promise<AiStatus | null> {
    if (!supa()) return { enabled: true, used: 0, limit: 30 };
    try {
      const { accessToken } = await import('./supabaseAdapter');
      const res = await fetch('/api/retomada', { headers: { Authorization: `Bearer ${await accessToken()}` } });
      return res.ok ? ((await res.json()) as AiStatus) : null;
    } catch { return null; }
  },
  async narrate(f: ChapterFacts): Promise<string> {
    if (!supa()) {
      await new Promise((r) => setTimeout(r, 700));
      return `Neste capítulo (${f.range}), você voltou a ${f.game}. ${f.summary} (Exemplo da demonstração: com a conta, quem escreve é a IA.)`;
    }
    const { accessToken } = await import('./supabaseAdapter');
    const res = await fetch('/api/retomada', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify({ kind: 'narrar', ...f }) });
    const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    if (!res.ok || !j.text) throw new Error(j.error ?? 'A IA não respondeu agora.');
    return j.text;
  },
};
