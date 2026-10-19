/**
 * Vídeos dos capítulos (C4, migração 0063): os vídeos de cada item da lista do jogo, a busca automática no YouTube
 * (feita pelo servidor, uma vez por jogo), "Trocar o vídeo" (link colado por quem joga) e o detonado do canal WinnerZ
 * (playlist ligada pela administração). Na demonstração, os links colados ficam só neste navegador.
 */
import { useEffect, useState } from 'react';
import { getState, useStore } from './store';
import { ytParse, type PartVideo } from '../lib/ytLink';
import { setupNote } from '../lib/setupNote';

export interface VideoState { videos: PartVideo[]; job?: 'rodando' | 'feito' | 'sem_video' | 'erro' | null; jobNote?: string | null; canEdit?: boolean; admin?: boolean }

const supa = () => getState().mode === 'supabase';
const cache = new Map<string, VideoState>();
const asked = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const dkey = (g: string) => `wz.demo.videos.${g}`;
const MSG: Record<string, string> = {
  outline_forbidden: 'Só quem tem o jogo na Jornada pode trocar o vídeo.',
  video_part: 'Este item não está mais na lista.',
  video_invalid: 'Esse link não parece de um vídeo do YouTube.',
  video_limit: 'Você já mexeu em muitos vídeos hoje. Tente amanhã.',
  video_canal: 'O detonado do canal só a administração tira.',
};
const nice = (e: unknown) => {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  const k = Object.keys(MSG).find((x) => m.includes(x));
  if (k) return new Error(MSG[k]);
  if (/part_video_hide/i.test(m)) return new Error(setupNote('Falta rodar a migração 0064 no Supabase.'));
  if (/part_videos|part_video_set|function .* does not exist|PGRST202/i.test(m)) return new Error(setupNote('Falta rodar a migração 0063 no Supabase.'));
  return new Error('Não deu agora. Tente de novo.');
};
const client = async () => (await import('./supabaseAdapter')).getClient();
async function authed(body: Record<string, unknown>) {
  const { accessToken } = await import('./supabaseAdapter');
  const r = await fetch('/api/retomada', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { state?: string; reason?: string; error?: string; diag?: string };
  if (!r.ok) throw new Error(j.error ?? 'O servidor não respondeu agora.');
  return j;
}

function demoGet(gameId: string): VideoState {
  try { const v = JSON.parse(localStorage.getItem(dkey(gameId)) || 'null'); if (v) return { ...v, canEdit: true }; } catch { /* sem armazenamento */ }
  return { videos: [], canEdit: true };
}

export const videoApi = {
  peek: (gameId: string) => cache.get(gameId),
  async get(gameId: string, fresh = false): Promise<VideoState> {
    if (!fresh && cache.has(gameId)) return cache.get(gameId)!;
    let v: VideoState;
    if (!supa()) v = demoGet(gameId);
    else {
      const { data, error } = await (await client()).rpc('part_videos', { p_game: gameId });
      if (error) { v = { videos: [] }; cache.set(gameId, v); emit(); throw nice(error); }
      v = (data as VideoState) ?? { videos: [] };
    }
    cache.set(gameId, v); emit();
    return v;
  },
  /** Busca automática (uma vez por visita; o servidor decide se precisa). */
  async auto(gameId: string, force = false): Promise<{ state?: string; reason?: string; diag?: string } | null> {
    if (!supa() || (asked.has(gameId) && !force)) return null;
    asked.add(gameId);
    try {
      const j = await authed({ kind: 'videos', game: gameId, force });
      if (j.state === 'pronto' || j.state === 'rodando') {
        for (let i = 0; i < (j.state === 'rodando' ? 12 : 1); i++) {
          if (j.state === 'rodando') await new Promise((ok) => setTimeout(ok, 5000));
          const v = await videoApi.get(gameId, true).catch(() => null);
          if (v?.videos.length || (v?.job && v.job !== 'rodando')) break;
        }
      }
      return j;
    } catch { return null; }
  },
  /** "Trocar o vídeo": link do YouTube colado (o minuto vem do t=). Vazio tira a escolha de pessoa. */
  async set(gameId: string, partId: string, url: string): Promise<VideoState> {
    const p = url.trim() ? ytParse(url) : null;
    if (url.trim() && !p) throw new Error('Cole o link de um vídeo do YouTube (pode ter o minuto, como &t=754).');
    if (!supa()) {
      const cur = demoGet(gameId);
      const videos = cur.videos.filter((v) => !(v.partId === partId && v.source === 'pessoa'));
      if (p) videos.push({ partId, source: 'pessoa', lang: '?', videoId: p.id, start: p.start });
      const v = { ...cur, videos };
      try { localStorage.setItem(dkey(gameId), JSON.stringify(v)); } catch { /* sem armazenamento */ }
      cache.set(gameId, v); emit();
      return v;
    }
    const { data, error } = await (await client()).rpc('part_video_set', { p_game: gameId, p_part: partId, p_video: p?.id ?? null, p_start: p?.start ?? 0 });
    if (error) throw nice(error);
    cache.set(gameId, data as VideoState); emit();
    return data as VideoState;
  },
  /** "Não é deste trecho": o vídeo some daquele item para todo mundo (e a busca não o põe ali de novo). */
  async hide(gameId: string, partId: string, videoId: string): Promise<VideoState> {
    if (!supa()) {
      const cur = demoGet(gameId);
      const v = { ...cur, videos: cur.videos.filter((x) => !(x.partId === partId && x.videoId === videoId)) };
      try { localStorage.setItem(dkey(gameId), JSON.stringify(v)); } catch { /* sem armazenamento */ }
      cache.set(gameId, v); emit();
      return v;
    }
    const { data, error } = await (await client()).rpc('part_video_hide', { p_game: gameId, p_part: partId, p_video: videoId });
    if (error) throw nice(error);
    cache.set(gameId, data as VideoState); emit();
    return data as VideoState;
  },
  /** Administração: busca os vídeos do jogo de novo (troca os automáticos). */
  async redo(gameId: string): Promise<string> {
    const j = await videoApi.auto(gameId, true);
    await videoApi.get(gameId, true).catch(() => null);
    if (!j) throw new Error('O servidor não respondeu agora.');
    return [j.state === 'pronto' ? 'Vídeos buscados de novo' : j.reason ?? `Resultado: ${j.state}`, j.diag].filter(Boolean).join(' · ');
  },
  /** Administração: liga uma playlist do canal WinnerZ ao jogo; a IA distribui os vídeos pelos itens. */
  async canal(gameId: string, playlistUrl: string): Promise<string> {
    if (!supa()) throw new Error('Na demonstração não dá para ligar playlists.');
    const j = await authed({ kind: 'videos', game: gameId, playlist: playlistUrl.trim() });
    await videoApi.get(gameId, true).catch(() => null);
    if (j.state !== 'pronto') throw new Error(j.reason ?? 'Nenhum vídeo da playlist bateu com a lista.');
    return j.diag ?? '';
  },
};

/** Os vídeos do jogo (carrega na primeira vez; com lista e sem vídeos, pede a busca automática). */
export function useVideos(gameId: string | undefined, hasList: boolean): VideoState | undefined {
  const mode = useStore((s) => s.mode);
  const logged = useStore((s) => !!s.profile);
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  useEffect(() => {
    if (!gameId || (mode === 'supabase' && !logged)) return;
    const go = async () => {
      const v = cache.get(gameId) ?? await videoApi.get(gameId).catch(() => null);
      if (hasList && v && !v.videos.length && v.job !== 'rodando') void videoApi.auto(gameId);
    };
    void go();
  }, [gameId, mode, logged, hasList]);
  return gameId ? cache.get(gameId) : undefined;
}
