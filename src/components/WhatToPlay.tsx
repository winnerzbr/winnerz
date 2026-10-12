import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore, currentHistory, lastNote, isOpenState, actions } from '../data/store';
import { shortPlatform } from '../lib/platforms';
import { CoverArt } from './CoverArt';
import type { State, Game, ID } from '../data/types';
import { ago, dayMonth } from '../lib/format';
import { playStateFor } from './PlayButton';
import { gameDna, fmtHours, topGenre, type Dna } from '../lib/dna';
import { localDay } from '../lib/dates';
import { loadMeta } from '../lib/igdbMeta';
import { pt } from '../lib/igdbPt';
import { track } from '../lib/track';

export type Idea = {
  game: Game;
  meta: string;
  /** "Por que pode ser para você?": sinais explicáveis, nunca porcentagem de afinidade. */
  why: string[];
  cta: string;
  /** 'play' abre a Jornada; 'open' só abre a ficha (descoberta). */
  action: 'play' | 'open';
  /** Está no acervo (dá para "Não pretendo jogar" e lembrar o "Não agora"). */
  known: boolean;
};

export const MOODS = ['Tenho pouco tempo', 'Uma noite inteira', 'Algo leve', 'Com alguém', 'Surpreenda-me'] as const;
const SHORT = 0, NIGHT = 1, LIGHT = 2, TOGETHER = 3, SURPRISE = 4;

function hoursLine(d: Dna) {
  if (d.hours == null) return '';
  return ` Cerca de ${fmtHours(d.hours)} para zerar${d.hoursSource === 'voce' ? ', pela sua estimativa' : ', pela média do IGDB'}.`;
}

/** A razão que pesa para o momento escolhido, a partir do DNA do jogo. */
function moodReason(mood: number, d: Dna): string | null {
  const t = (k: string) => d.traits.find((x) => x.key === k);
  if (mood === SHORT) return t('curtas') ? 'Bom em sessões curtas: dá para parar a qualquer hora.' : d.hours != null && d.hours <= 8 ? `Curto: cerca de ${fmtHours(d.hours)} do começo ao fim.` : null;
  if (mood === NIGHT) return d.fits.story ? 'Puxado pela história: rende numa noite sem pressa.' : d.hours != null && d.hours >= 25 ? 'Longo, bom para mergulhar com tempo.' : null;
  if (mood === LIGHT) return d.fits.light ? (t('retomar') ? 'Leve e fácil de retomar, sem muitos sistemas para lembrar.' : 'Leve: começa e termina sem exigir muito.') : null;
  if (mood === TOGETHER) return t('junto')?.detail ?? null;
  return null;
}

function notNow(s: State, gameId: ID, today: string) {
  const until = s.myGames[gameId]?.notNowUntil;
  return !!until && until > today;
}

/** "Entre o que já está ao meu alcance": o que está em andamento, pausado ou na estante. */
export function ideasFor(s: State, mood: number, focusId?: string, today = localDay(), seed = 1): Idea[] {
  const started = new Set(s.journeys.map((j) => j.gameId));
  const mine = (g: ID) => s.myGames[g] ?? { gameId: g };
  const dnaOf = new Map<ID, Dna>();
  const dna = (g: ID) => dnaOf.get(g) ?? dnaOf.set(g, gameDna(s.games[g], s)).get(g)!;
  const owned = [...new Set(s.copies.map((c) => c.gameId))].filter((g) => s.games[g] && !started.has(g) && !mine(g).wontPlay && !notNow(s, g, today));
  // Prioridade alta primeiro; depois os mais curtos (pela sua estimativa ou pela média do IGDB).
  const hrs = (g: ID) => dna(g).hours ?? 99;
  owned.sort((a, b) => (mine(a).priority ?? 2) - (mine(b).priority ?? 2) || hrs(a) - hrs(b));

  const fresh = (gid: ID): Idea => {
    const c = s.copies.find((x) => x.gameId === gid)!;
    const d = dna(gid);
    const why = [
      mine(gid).priority === 1 ? 'Está na sua lista de prioridade alta.' : null,
      moodReason(mood, d),
    ].filter((x): x is string => !!x);
    if (!why.length) why.push('Está ao seu alcance e você ainda não começou. Ter não obriga, mas pode ser hoje.');
    return { game: s.games[gid], meta: `${shortPlatform(c.platform)}, ${c.kind === 'fisico' ? 'mídia física' : c.kind === 'assinatura' ? 'assinatura' : 'digital'}. Na sua estante, ainda sem História.${hoursLine(d)}`, why, cta: 'Começar Jornada', action: 'play', known: true };
  };

  const active = s.journeys.filter((j) => j.id !== focusId && s.games[j.gameId] && !notNow(s, j.gameId, today)).map((j) => {
    const h = currentHistory(s, j.id);
    if (!h || !isOpenState(h.state)) return null;
    const note = lastNote(s, j.id);
    const last = [...s.sessions].filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const paused = h.state === 'pausada';
    const d = dna(j.gameId);
    const why = [
      note?.note ? `Seu último recado: “${note.note}”` : paused ? 'Você pausou sem pressa. Dá para voltar de onde parou.' : 'Você já está no meio desta história. É o retorno mais fácil.',
      moodReason(mood, d),
      paused && d.fits.relearn ? 'Pode pedir uns minutos para reaprender os comandos.' : null,
    ].filter((x): x is string => !!x);
    return {
      paused, gameId: j.gameId,
      idea: {
        game: s.games[j.gameId],
        meta: paused ? (h.note ?? j.pausedNote ?? 'Pausado.') : `Em andamento${h.progress != null ? `, ${h.progress}%` : ''}.${last ? ` Última sessão ${ago(last.startedAt)}.` : ''}`,
        why, cta: paused ? 'Retomar' : 'Continuar', action: 'play', known: true,
      } as Idea,
    };
  }).filter(Boolean) as { paused: boolean; gameId: ID; idea: Idea }[];

  const going = active.filter((a) => !a.paused);
  const paused = active.filter((a) => a.paused);
  const ideas = (xs: typeof active) => xs.map((a) => a.idea);
  const fit = (k: keyof Dna['fits']) => (g: ID) => dna(g).fits[k];
  const longFirst = [...owned].sort((a, b) => Number(fit('long')(b)) - Number(fit('long')(a)));

  let list: Idea[];
  switch (mood) {
    case SHORT: list = [...ideas(going.filter((a) => fit('short')(a.gameId))), ...owned.filter(fit('short')).sort((a, b) => hrs(a) - hrs(b)).slice(0, 40).map(fresh), ...ideas(going.filter((a) => !fit('short')(a.gameId)))]; break;
    case NIGHT: list = [...ideas(paused), ...longFirst.slice(0, 60).map(fresh), ...ideas(going)]; break;
    case LIGHT: list = [...ideas(going.filter((a) => fit('light')(a.gameId))), ...owned.filter(fit('light')).slice(0, 40).map(fresh), ...ideas(paused.filter((a) => fit('light')(a.gameId)))]; break;
    case TOGETHER: return [...ideas(going.filter((a) => fit('together')(a.gameId))), ...ideas(paused.filter((a) => fit('together')(a.gameId))), ...owned.filter(fit('together')).slice(0, 40).map(fresh)];
    default: list = shuffle([...owned.map(fresh), ...ideas(paused)], seed);
  }
  return list.length ? list : [...ideas(going), ...ideas(paused), ...owned.slice(0, 60).map(fresh)];
}

/** "Quero descobrir algo", parte que não precisa de internet: os Desejos já lançados. */
export function wishIdeas(s: State, mood: number, today = localDay(), seed = 1): Idea[] {
  const owned = new Set(s.copies.map((c) => c.gameId));
  const started = new Set(s.journeys.map((j) => j.gameId));
  const year = Number(today.slice(0, 4));
  const out: Idea[] = [];
  for (const w of s.wishes) {
    const g = s.games[w.gameId];
    if (!g || owned.has(g.id) || started.has(g.id) || notNow(s, g.id, today) || s.myGames[g.id]?.wontPlay) continue;
    // Sem data exata, só conta como lançado o que saiu em ano anterior (o deste ano pode nem ter saído).
    const released = g.releasedOn ? g.releasedOn <= today : g.year != null && g.year < year;
    if (!released) continue;
    const d = gameDna(g, s);
    if (mood === TOGETHER && !d.fits.together) continue;
    const why = ['Está nos seus Desejos.', moodReason(mood, d)].filter((x): x is string => !!x);
    out.push({ game: g, meta: `${g.year ?? ''}${g.platforms.length ? `${g.year ? ', ' : ''}${g.platforms.slice(0, 3).map(shortPlatform).join(', ')}` : ''}.${hoursLine(d)}`, why, cta: 'Ver a ficha', action: 'open', known: true });
  }
  return mood === SURPRISE ? shuffle(out, seed) : out;
}

type Found = { igdbId: number; slug: string; title: string; year?: number; cover: string; platforms: string[]; rating?: number };

/** "Quero descobrir algo", do catálogo do IGDB: bem avaliados no gênero que você mais zera. */
async function catalogIdeas(s: State, mood: number): Promise<Idea[]> {
  const meta = await loadMeta();
  const top = topGenre(s);
  const q = new URLSearchParams({ explore: '1', sort: top ? 'rating' : 'popular', page: '0' });
  const genreId = top && meta?.genres.find((x) => x.name === top.name)?.id;
  if (genreId) q.set('genre', String(genreId));
  const coop = mood === TOGETHER ? meta?.modes.find((x) => x.name === 'Co-operative')?.id : undefined;
  if (coop) q.set('mode', String(coop));
  const r = await fetch(`/api/igdb?${q}`);
  if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return [];
  const rows: Found[] = await r.json();
  const known = new Set(Object.values(s.games).map((g) => g.igdbId).filter(Boolean));
  const why = [
    genreId && top ? `${pt(top.name)} é o gênero que você mais zerou (${top.count} ${top.count === 1 ? 'jogo' : 'jogos'}), e este é dos mais bem avaliados dele no IGDB.` : 'Entre os mais populares do IGDB.',
    coop ? 'Tem modo cooperativo, segundo o IGDB.' : null,
  ].filter((x): x is string => !!x);
  const list = rows.filter((x) => !known.has(x.igdbId)).map((x): Idea => ({
    game: { id: `igdb-${x.igdbId}`, slug: x.slug, igdbId: x.igdbId, title: x.title, cover: x.cover, year: x.year, platforms: x.platforms ?? [] },
    meta: `${x.year ?? ''}${x.platforms?.length ? `${x.year ? ', ' : ''}${x.platforms.slice(0, 3).map(shortPlatform).join(', ')}` : ''}. Fora do seu acervo.`,
    why, cta: 'Ver a ficha', action: 'open', known: false,
  }));
  return mood === SURPRISE ? shuffle(list, Math.random()) : list;
}

/** Embaralha sempre igual para a mesma semente: a ideia não troca sozinha quando algo na página atualiza. */
function shuffle<T>(a: T[], seed = 1): T[] {
  const x = [...a];
  let t = Math.floor(seed * 2 ** 31) || 1;
  const rnd = () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  for (let i = x.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [x[i], x[k]] = [x[k], x[i]]; }
  return x.slice(0, 40);
}

const buddyLines = [
  'Eu tentei jogar isso uma vez. Fiquei preso no menu de pausa. Você vai se sair melhor.',
  'Bip. Escolhi com a minha hélice. Ela sempre aponta pro norte. Ou pro sul. Varia.',
  'Eu dirijo como jogo: com muita confiança e nenhum resultado.',
  'Me escondi numa caixa de papelão pra pensar nessa dica. Ninguém me achou por dois dias.',
  'Jogar junto é ótimo. Eu jogo junto comigo mesmo toda quinta.',
];

/** "O que jogar hoje?": uma ideia por vez, por dois caminhos, com o porquê à vista. */
export function WhatToPlay({ excludeJourneyId, headingId = 'oqj' }: { excludeJourneyId?: string; headingId?: string }) {
  const s = useStore((x) => x);
  const [path, setPath] = useState<'alcance' | 'descobrir'>('alcance');
  const [mood, setMood] = useState(0);
  const [seed, setSeed] = useState(() => Math.random());
  const [alt, setAlt] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState('');
  const [catalog, setCatalog] = useState<{ key: string; items: Idea[]; state: 'loading' | 'ok' | 'error' } | null>(null);
  const catKey = `${mood === TOGETHER ? 'coop' : 'any'}|${mood === SURPRISE}`;

  useEffect(() => {
    if (path !== 'descobrir' || catalog?.key === catKey) return;
    let alive = true;
    setCatalog({ key: catKey, items: [], state: 'loading' });
    catalogIdeas(s, mood).then((items) => alive && setCatalog({ key: catKey, items, state: 'ok' })).catch(() => alive && setCatalog({ key: catKey, items: [], state: 'error' }));
    return () => { alive = false; };
  }, [path, catKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ideas = useMemo(() => {
    const base = path === 'alcance' ? ideasFor(s, mood, excludeJourneyId, localDay(), seed) : [...wishIdeas(s, mood, localDay(), seed), ...(catalog?.key === catKey ? catalog.items : [])];
    return base.filter((i) => !skipped.includes(i.game.id));
  }, [s, path, mood, excludeJourneyId, skipped, catalog, catKey, seed]);
  const idea = ideas.length ? ideas[alt % ideas.length] : null;
  const play = (gameId: string) => playStateFor(s, gameId).go();

  const reset = () => { setAlt(0); setAsking(false); setNotice(''); };
  const later = (kind: 'hoje' | 'semanas' | 'nunca' | 'conheco') => {
    if (!idea) return;
    const id = idea.game.id;
    setSkipped([...skipped, id]); setAsking(false);
    if (kind === 'nunca') { actions.setMyGame(id, { wontPlay: true }); setNotice(`${idea.game.title} marcado como “não vou jogar”. Dá para desfazer na ficha do jogo.`); }
    else if (kind === 'conheco') setNotice('Certo, não sugiro de novo nesta visita.');
    else if (idea.known && !(s.schemaV6 || s.mode === 'demo')) setNotice('Certo, fica de fora nesta visita.');
    else if (idea.known) {
      const until = localDay(kind === 'hoje' ? 1 : 21);
      actions.setMyGame(id, { notNowUntil: until, notNowReason: kind });
      setNotice(kind === 'hoje' ? `Combinado. ${idea.game.title} volta a aparecer amanhã.` : `Combinado. ${idea.game.title} fica de fora até ${dayMonth(until + 'T12:00:00')}.`);
    } else setNotice('Certo, fica para outro dia.');
    track(`oqj.nao-agora.${kind}`);
  };

  const empty = path === 'descobrir'
    ? catalog?.state === 'loading' ? 'Procurando no catálogo do IGDB…' : catalog?.state === 'error' ? 'O catálogo do IGDB não respondeu agora. Seus Desejos continuam aqui quando houver algum lançado.' : 'Nada novo por aqui agora.'
    : mood === TOGETHER ? 'Nenhum jogo ao seu alcance tem modo cooperativo ou multijogador informado no IGDB.' : null;

  return (
    <section aria-labelledby={headingId} className="card what">
      <h2 id={headingId} className="t">O que jogar hoje?</h2>
      <div role="tablist" aria-label="Por onde procurar" className="what__paths">
        <button role="tab" aria-selected={path === 'alcance'} onClick={() => { setPath('alcance'); reset(); }}>Entre o que já está ao meu alcance</button>
        <button role="tab" aria-selected={path === 'descobrir'} onClick={() => { setPath('descobrir'); reset(); track('oqj.descobrir'); }}>Quero descobrir algo</button>
      </div>
      <div role="group" aria-label="Como está seu dia (opcional)" className="chips">
        {MOODS.map((l, i) => (
          <button key={l} className="chip" aria-pressed={mood === i} onClick={() => { setMood(i); setSeed(Math.random()); reset(); }}>{l}</button>
        ))}
      </div>
      {idea ? (
        <div className="what__pick" key={idea.game.id + mood + path}>
          <Link to={`/jogos/${idea.game.slug}`} className="what__cover" aria-label={`Abrir a ficha de ${idea.game.title}`}><CoverArt game={idea.game} lazy={false} /></Link>
          <div className="what__info">
            <div className="t what__title">{idea.game.title}</div>
            <div className="muted what__meta">{idea.meta}</div>
            <div className="what__why">
              <strong>Por que pode ser para você?</strong>
              <ul>{idea.why.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
            {asking ? (
              <div className="what__later" role="group" aria-label="Não agora">
                <span className="muted">Não agora porque…</span>
                <button className="btn ghost sm" onClick={() => later('hoje')}>Hoje não</button>
                {idea.known && <button className="btn ghost sm" onClick={() => later('semanas')}>Não é o momento (3 semanas)</button>}
                {idea.known && idea.action === 'play' && idea.cta === 'Começar Jornada' && <button className="btn ghost sm" onClick={() => later('nunca')}>Não pretendo jogar</button>}
                {!idea.known && <button className="btn ghost sm" onClick={() => later('conheco')}>Já conheço</button>}
                <button className="btn quiet sm" onClick={() => setAsking(false)}>Voltar</button>
              </div>
            ) : (
              <div className="what__actions">
                {idea.action === 'play'
                  ? <button className="btn primary" onClick={() => play(idea.game.id)}>{idea.cta}</button>
                  : <Link className="btn primary" to={`/jogos/${idea.game.slug}`}>{idea.cta}</Link>}
                <button className="btn ghost" onClick={() => { setAlt(alt + 1); setNotice(''); }}>Outra ideia</button>
                <button className="btn quiet" onClick={() => setAsking(true)}>Não agora</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="what__empty">{empty ?? <>Nada por enquanto, e tudo bem. <Link to="/colecao">Adicione jogos à estante</Link> para receber ideias.</>}</p>
      )}
      {notice && <p className="what__notice muted" role="status">{notice}</p>}
      <div className="buddy">
        <img src="/brand/iamiguinho-icon.webp" alt="" />
        <p><span className="buddy__name">IAmiguinho</span> <span className="buddy__tag">mascote</span>{buddyLines[(mood + alt) % buddyLines.length]}</p>
      </div>
    </section>
  );
}
