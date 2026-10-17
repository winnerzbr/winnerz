import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { useStore, actions } from '../data/store';
import { shortPlatform } from '../lib/platforms';
import { CoverArt } from './CoverArt';
import type { Game, State } from '../data/types';
import { formatScore } from '../lib/rating';
import { dayMonth } from '../lib/format';
import { playStateFor } from './PlayButton';
import { gameDna, fmtHours, type Dna } from '../lib/dna';
import { localDay } from '../lib/dates';
import { loadMeta } from '../lib/igdbMeta';
import { pt } from '../lib/igdbPt';
import { track } from '../lib/track';
import { Buddy, useBuddy } from './Buddy';
import { MOODS, LENGTHS, STATUSES, recommend, reachableGames, noteShown, markMismatch, matchesExtra, extraOptions, extraCount, type Extra, daySeed, type Idea, type MoodId, type Reason } from '../lib/recommend';
import { vibesApi } from '../data/vibesApi';
import { Icon } from './Icon';
import { useBackdrop } from './Backdrop';

export type { Idea } from '../lib/recommend';

function hoursLine(d: Dna) {
  if (d.hours == null) return '';
  return ` Cerca de ${fmtHours(d.hours)} para zerar${d.hoursSource === 'voce' ? ', pela sua estimativa' : ', pela média de quem já jogou'}.`;
}

/** A razão que pesa para o momento escolhido, a partir do DNA do jogo (para os Desejos). */
function moodReason(mood: MoodId, d: Dna): Reason | null {
  const t = (k: string) => d.traits.find((x) => x.key === k);
  if (mood === 'pouco') return t('curtas') ? { icon: 'relogio', text: 'Bom em sessões curtas: dá para parar a qualquer hora.' } : d.hours != null && d.hours <= 8 ? { icon: 'relogio', text: `Curto: cerca de ${fmtHours(d.hours)} do começo ao fim.` } : null;
  if (mood === 'noite') return d.fits.story ? { icon: 'play', text: 'Puxado pela história: rende numa noite sem pressa.' } : d.hours != null && d.hours >= 25 ? { icon: 'play', text: 'Longo, bom para mergulhar com tempo.' } : null;
  if (mood === 'historia') return d.fits.story ? { icon: 'carta', text: 'Puxado pela história.' } : null;
  if (mood === 'relaxar') return d.fits.light ? { icon: 'lampada', text: 'Leve: começa e termina sem exigir muito.' } : null;
  if (mood === 'alguem') { const j = t('junto'); return j ? { icon: 'pessoas', text: j.detail } : null; }
  return null;
}

const capFirst = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

function notNow(s: State, gameId: string, today: string) {
  const until = s.myGames[gameId]?.notNowUntil;
  return !!until && until > today;
}

/** "Quero descobrir algo", parte que não precisa de internet: os Desejos já lançados. */
export function wishIdeas(s: State, mood: MoodId, today = localDay(), seed = 1): Idea[] {
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
    if (mood === 'alguem' && !d.fits.together) continue;
    if (mood === 'historia' && !d.fits.story) continue;
    const why = [{ icon: 'desejo', text: 'Está nos seus Desejos.' }, moodReason(mood, d)].filter((x): x is Reason => !!x);
    out.push({ game: g, meta: `${g.year ?? ''}${g.platforms.length ? `${g.year ? ', ' : ''}${g.platforms.slice(0, 3).map(shortPlatform).join(', ')}` : ''}.${hoursLine(d)}`, why, cta: 'Ver a ficha', action: 'open', known: true, score: 0, kind: 'estante' });
  }
  return mood === 'surpresa' ? shuffle(out, seed) : out;
}

type Found = { igdbId: number; slug: string; title: string; year?: number; cover: string; platforms: string[]; rating?: number; critica?: number; criticas?: number; jogadores?: number };
const mil = (n: number) => n.toLocaleString('pt-BR');
/** De onde vem a nota: crítica (agregada de veículos de imprensa) e quantas pessoas avaliaram, ambas do IGDB. */
function notaReason(x: Found): Reason | null {
  const crit = x.critica != null && (x.criticas ?? 0) > 0 ? `Crítica ${x.critica} em ${mil(x.criticas!)} ${x.criticas === 1 ? 'análise' : 'análises'}` : '';
  const jog = (x.jogadores ?? 0) > 0 ? `${mil(x.jogadores!)} ${x.jogadores === 1 ? 'avaliação' : 'avaliações'} de jogadores` : '';
  return crit || jog ? { icon: 'brilho', text: `${[crit, jog].filter(Boolean).join('; ')} no IGDB.` } : null;
}

/** Conta e ordena (do mais comum ao menos). */
function contagem(nomes: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const n of nomes) if (n) m.set(n, (m.get(n) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Jogos que a pessoa amou (avaliou bem ou favoritou), para "Parecido com X". */
function amados(s: State): { g: Game; como: string }[] {
  const out: { g: Game; como: string }[] = []; const vistos = new Set<string>();
  const add = (id: string, como: string) => { const g = s.games[id]; if (g?.igdbId && !vistos.has(id)) { vistos.add(id); out.push({ g, como }); } };
  for (const r of s.reviews.filter((x) => x.mine && x.rating.normalized >= 80).sort((x, y) => y.rating.normalized - x.rating.normalized)) add(r.gameId, `avaliou com ${formatScore(r.rating.normalized, s.prefs.scale)}`);
  for (const id of s.favorites) add(id, 'favoritou');
  return out;
}

type Fonte = { q: Record<string, string>; why: Reason };

/**
 * "Quero descobrir algo", do catálogo do IGDB, por vários caminhos do seu gosto: os dois gêneros que você mais
 * zera, o tema mais frequente, parecidos com jogos que você amou, a década que você mais zerou e a plataforma
 * da sua coleção. As listas se alternam, para cada ideia trazer um motivo diferente. Todas usam a nota com
 * reconhecimento (só jogo conhecido e bem avaliado).
 */
async function catalogIdeas(s: State, mood: MoodId, seed = Math.random()): Promise<Idea[]> {
  const meta = await loadMeta();
  const doneIds = new Set(s.journeys.filter((j) => s.histories.some((h) => h.journeyId === j.id && h.state === 'concluida')).map((j) => j.gameId));
  const done = [...doneIds].map((id) => s.games[id]).filter((g): g is Game => !!g);
  const fontes: Fonte[] = [];

  const generos = contagem(done.flatMap((g) => (g.genres ?? '').split(/,\s*/)).filter((x) => x !== 'Indie'));
  generos.slice(0, 2).forEach(([nome, n], i) => {
    const id = meta?.genres.find((x) => x.name === nome)?.id;
    if (!id) return;
    fontes.push({ q: { genre: String(id) }, why: i === 0
      ? { icon: 'coracao', text: `${pt(nome)} é o gênero que você mais zerou (${plural(n, 'jogo', 'jogos')}), e este é dos mais bem avaliados e conhecidos dele.` }
      : { icon: 'coracao', text: `Você também zera bastante ${pt(nome)} (${plural(n, 'jogo', 'jogos')}). Este é um dos destaques do gênero.` } });
  });
  const tema = contagem(done.flatMap((g) => g.themes ?? []))[0];
  const temaId = tema && tema[1] >= 2 ? meta?.themes.find((x) => x.name === tema[0])?.id : undefined;
  if (tema && temaId) fontes.push({ q: { theme: String(temaId) }, why: { icon: 'brilho', text: `${pt(tema[0])} aparece em ${plural(tema[1], 'jogo', 'jogos')} que você zerou. Este é dos mais aclamados com esse tema.` } });
  for (const a of shuffle(amados(s), seed).slice(0, 2)) fontes.push({ q: { like: String(a.g.igdbId) }, why: { icon: 'jornada', text: `Parecido com ${a.g.title}, que você ${a.como}.` } });
  const decada = contagem(done.filter((g) => g.year).map((g) => String(Math.floor(g.year! / 10) * 10)))[0];
  if (decada && decada[1] >= 3) {
    const d = Number(decada[0]); const nome = d < 2000 ? `anos ${String(d).slice(2)}` : `anos ${d}`;
    fontes.push({ q: { from: String(d), to: String(d + 9) }, why: { icon: 'relogio', text: `Dos ${nome}, a década dos jogos que você mais zerou (${decada[1]}).` } });
  }
  const plat = contagem(s.copies.map((c) => c.platform))[0];
  const platId = plat ? meta?.platforms.find((p) => p.name === plat[0] || shortPlatform(p.name) === plat[0])?.id : undefined;
  if (plat && platId) fontes.push({ q: { platform: String(platId) }, why: { icon: 'jogos', text: `Dos mais aclamados no ${shortPlatform(plat[0])}, onde está a maior parte da sua coleção.` } });
  if (!fontes.length) fontes.push({ q: {}, why: { icon: 'coracao', text: 'Entre os mais aclamados e conhecidos do catálogo.' } });

  const coop = mood === 'alguem' ? meta?.modes.find((x) => x.name === 'Co-operative')?.id : undefined;
  const known = new Set(Object.values(s.games).map((g) => g.igdbId).filter(Boolean));
  const listas = await Promise.all(fontes.map(async (f) => {
    const q = new URLSearchParams({ explore: '1', sort: 'rating', page: '0', ...f.q });
    if (coop) q.set('mode', String(coop));
    try {
      const r = await fetch(`/api/igdb?${q}`);
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return [];
      const rows: Found[] = await r.json();
      const lista = rows.filter((x) => !known.has(x.igdbId)).map((x): Idea => ({
        game: { id: `igdb-${x.igdbId}`, slug: x.slug, igdbId: x.igdbId, title: x.title, cover: x.cover, year: x.year, platforms: x.platforms ?? [] },
        meta: `${x.year ?? ''}${x.platforms?.length ? `${x.year ? ', ' : ''}${x.platforms.slice(0, 3).map(shortPlatform).join(', ')}` : ''}. Fora do seu acervo.`,
        why: [f.why, coop ? { icon: 'pessoas', text: 'Possui modo cooperativo.' } : null, notaReason(x)].filter((r): r is Reason => !!r),
        cta: 'Ver a ficha', action: 'open', known: false, score: 0, kind: 'estante',
      }));
      // "Surpreenda-me" embaralha; nos outros, os melhores de cada caminho vêm primeiro.
      return mood === 'surpresa' ? shuffle(lista, seed) : lista;
    } catch { return []; }
  }));
  // Alterna os caminhos (um de cada vez, começando por um diferente a cada visita), sem repetir jogo.
  const out: Idea[] = []; const vistos = new Set<number>();
  const inicio = Math.floor(seed * listas.length);
  for (let i = 0; out.length < 60 && listas.some((l) => l.length > i); i++) {
    for (let k = 0; k < listas.length; k++) {
      const x = listas[(inicio + k) % listas.length][i];
      if (x && !vistos.has(x.game.igdbId!)) { vistos.add(x.game.igdbId!); out.push(x); }
    }
  }
  return out;
}

/** Embaralha sempre igual para a mesma semente: a ideia não troca sozinha quando algo na página atualiza. */
function shuffle<T>(a: T[], seed = 1): T[] {
  const x = [...a];
  let t = Math.floor(seed * 2 ** 31) || 1;
  const rnd = () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  for (let i = x.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [x[i], x[k]] = [x[k], x[i]]; }
  return x.slice(0, 40);
}

/** "O que jogar hoje?": uma ideia por vez, por dois caminhos, com o porquê à vista. */
/** O mascote só aparece depois de três "Outra ideia" seguidos (e no máximo uma vez por dia). */
function IndecisoBuddy() {
  return <Buddy line={useBuddy('indeciso', true)} />;
}

export function WhatToPlay({ excludeJourneyId, headingId = 'oqj' }: { excludeJourneyId?: string; headingId?: string }) {
  const s = useStore((x) => x);
  const [path, setPath] = useState<'alcance' | 'descobrir'>('alcance');
  const [mood, setMood] = useState<MoodId>('surpresa');
  const [seed, setSeed] = useState(() => Math.random());
  const [alt, setAlt] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState('');
  const [catalog, setCatalog] = useState<{ key: string; items: Idea[]; state: 'loading' | 'ok' | 'error' } | null>(null);
  const catKey = `${mood === 'alguem' ? 'coop' : 'any'}|${mood === 'surpresa'}`;
  const moodDef = MOODS.find((m) => m.id === mood)!;
  // Filtros extras, combináveis (lembrados neste navegador).
  const [extra, setExtraState] = useState<Extra>(() => { try { return JSON.parse(localStorage.getItem('wz.oqj.extra') || '{}'); } catch { return {}; } });
  const [panel, setPanel] = useState(false);
  const setExtra = (e: Extra) => { setExtraState(e); setAlt(0); setNotice(''); try { localStorage.setItem('wz.oqj.extra', JSON.stringify(e)); } catch { /* só nesta visita */ } };
  const toggle = <K extends keyof Extra>(k: K, v: NonNullable<Extra[K]>[number]) => {
    const cur = (extra[k] ?? []) as string[];
    setExtra({ ...extra, [k]: cur.includes(v as string) ? cur.filter((x) => x !== v) : [...cur, v] });
    track(`oqj.extra.${k}`);
  };
  const opts = useMemo(() => extraOptions(s, excludeJourneyId), [s, excludeJourneyId]);
  const nExtra = extraCount(extra);

  useEffect(() => {
    if (path !== 'descobrir' || catalog?.key === catKey) return;
    let alive = true;
    setCatalog({ key: catKey, items: [], state: 'loading' });
    catalogIdeas(s, mood, seed).then((items) => alive && setCatalog({ key: catKey, items, state: 'ok' })).catch(() => alive && setCatalog({ key: catKey, items: [], state: 'error' }));
    return () => { alive = false; };
  }, [path, catKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clima dos jogos (comunidade, via IA): carrega o que existe e pede o que falta, em segundo plano.
  const [vibeTick, setVibeTick] = useState(0);
  useEffect(() => vibesApi.subscribe(() => setVibeTick((n) => n + 1)), []);
  useEffect(() => { vibesApi.ensure(reachableGames(s, excludeJourneyId)); }, [s.copies.length, s.journeys.length, excludeJourneyId]); // eslint-disable-line react-hooks/exhaustive-deps
  // O que já apareceu nesta visita (em qualquer filtro) vai para o fim: trocar o filtro deve trazer outra cara.
  const seen = useRef(new Set<string>());
  const ideas = useMemo(() => {
    const base = path === 'alcance'
      ? recommend(s, mood, { excludeJourneyId, seed: mood === 'surpresa' ? Math.floor(seed * 1e6) : undefined, vibe: vibesApi.get, extra })
      : [...shuffle(wishIdeas(s, mood, localDay(), seed), daySeed()), ...(catalog?.key === catKey ? catalog.items : [])].filter((i) => matchesExtra(s, i.game, { ...extra, status: undefined }));
    const fresh = base.filter((i) => !skipped.includes(i.game.id));
    return [...fresh.filter((i) => !seen.current.has(i.game.id)), ...fresh.filter((i) => seen.current.has(i.game.id))];
  }, [s, path, mood, excludeJourneyId, skipped, catalog, catKey, seed, vibeTick, extra]); // eslint-disable-line react-hooks/exhaustive-deps
  const idea = ideas.length ? ideas[alt % ideas.length] : null;
  useEffect(() => { if (idea) seen.current.add(idea.game.id); }, [idea?.game.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const bg = useBackdrop(idea?.game);
  useEffect(() => { if (idea && path === 'alcance') noteShown(idea.game.id); }, [idea?.game.id, path]); // eslint-disable-line react-hooks/exhaustive-deps
  const play = (gameId: string) => { track(`oqj.jogar.${mood}`); playStateFor(s, gameId).go(); };

  const reset = () => { setAlt(0); setAsking(false); setNotice(''); };
  const another = () => { if (idea && path === 'alcance') noteShown(idea.game.id, true); setAlt(alt + 1); setNotice(''); track('oqj.outra'); };
  const later = (kind: 'hoje' | 'semanas' | 'nunca' | 'conheco' | 'filtro') => {
    if (!idea) return;
    const id = idea.game.id;
    setSkipped([...skipped, id]); setAsking(false);
    if (kind === 'filtro') { markMismatch(id, mood); setNotice(`Anotado: ${idea.game.title} não aparece mais em “${moodDef.label}”.`); track(`oqj.nao-combina.${mood}`); return; }
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
    ? catalog?.state === 'loading' ? 'Procurando no catálogo…' : catalog?.state === 'error' ? 'O catálogo não respondeu agora. Seus Desejos continuam aqui quando houver algum lançado.' : 'Nada novo por aqui agora.'
    : mood === 'alguem' ? 'Nenhum jogo ao seu alcance tem modo cooperativo ou multijogador.' : mood === 'historia' ? 'Nenhum jogo ao seu alcance parece puxado pela história.' : mood === 'desafio' ? 'Nada ao seu alcance parece um desafio por enquanto.' : mood === 'relaxar' ? 'Nada ao seu alcance parece tranquilo o bastante para relaxar. Quando um jogo te descansar, ele aparece aqui.' : mood === 'diferente' ? 'Tudo ao seu alcance já é do seu padrão. Que tal “Descobrir algo”?' : null;
  const n = ideas.length ? (alt % ideas.length) + 1 : 0;

  return (
    <section aria-labelledby={headingId} className="card what">
      <h2 id={headingId} className="t">O que jogar hoje?</h2>
      <div role="tablist" aria-label="Por onde procurar" className="what__paths">
        <button role="tab" aria-selected={path === 'alcance'} onClick={() => { setPath('alcance'); reset(); }}>Ao meu alcance</button>
        <button role="tab" aria-selected={path === 'descobrir'} onClick={() => { setPath('descobrir'); reset(); track('oqj.descobrir'); }}>Descobrir algo</button>
      </div>
      <div className="what__filters">
        <span className="what__flabel" id={`${headingId}-mood`}>Como está seu dia?</span>
        <div role="group" aria-labelledby={`${headingId}-mood`} className="chips what__moods">
          {MOODS.map((m) => (
            <button key={m.id} className="chip" aria-pressed={mood === m.id} onClick={() => { setMood(m.id); setSeed(Math.random()); reset(); track(`oqj.filtro.${m.id}`); }}>{m.label}</button>
          ))}
        </div>
        <div className="what__extra-row">
          <button className="btn quiet sm what__more" aria-expanded={panel} onClick={() => setPanel(!panel)}><Icon name="filtro" size={15} />Mais filtros{nExtra ? <span className="what__badge">{nExtra}</span> : null}</button>
          {[...(extra.platforms ?? []).map((v) => ['platforms', v, v] as const), ...(extra.genres ?? []).map((v) => ['genres', v, capFirst(v)] as const),
            ...(extra.length ?? []).map((v) => ['length', v, LENGTHS.find((x) => x.id === v)?.label ?? v] as const),
            ...(path === 'alcance' ? (extra.status ?? []).map((v) => ['status', v, STATUSES.find((x) => x.id === v)?.label ?? v] as const) : [])].map(([k, v, label]) => (
            <button key={`${k}:${v}`} className="chip what__active" onClick={() => toggle(k, v as never)} aria-label={`Tirar o filtro ${label}`}>{label}<Icon name="fechar" size={12} /></button>
          ))}
          {nExtra > 0 && <button className="btn quiet sm" onClick={() => setExtra({})}>Limpar</button>}
        </div>
        {panel && (
          <div className="what__panel">
            {opts.platforms.length > 1 && (
              <fieldset><legend>Plataforma</legend><div className="chips">
                {opts.platforms.map((o) => <button key={o.id} className="chip" aria-pressed={!!extra.platforms?.includes(o.id)} onClick={() => toggle('platforms', o.id)}>{o.id}<span className="what__n">{o.n}</span></button>)}
              </div></fieldset>
            )}
            {opts.genres.length > 0 && (
              <fieldset><legend>Gênero e tema</legend><div className="chips">
                {opts.genres.map((o) => <button key={o.id} className="chip" aria-pressed={!!extra.genres?.includes(o.id)} onClick={() => toggle('genres', o.id)}>{capFirst(o.id)}<span className="what__n">{o.n}</span></button>)}
              </div></fieldset>
            )}
            <fieldset><legend>Duração para zerar</legend><div className="chips">
              {LENGTHS.map((o) => <button key={o.id} className="chip" aria-pressed={!!extra.length?.includes(o.id)} onClick={() => toggle('length', o.id)}>{o.label}</button>)}
            </div></fieldset>
            {path === 'alcance' && (
              <fieldset><legend>Situação</legend><div className="chips">
                {STATUSES.map((o) => <button key={o.id} className="chip" aria-pressed={!!extra.status?.includes(o.id)} onClick={() => toggle('status', o.id)}>{o.label}</button>)}
              </div></fieldset>
            )}
            <p className="faint what__hint">Dá para combinar: dentro de um grupo vale qualquer um; entre grupos, todos juntos.</p>
          </div>
        )}
      </div>
      {idea ? (
        <div className={`what__pick${bg ? ' has-bg' : ''}`} key={idea.game.id + mood + path} style={bg ? { ['--wbg' as string]: `url("${bg}")` } : undefined}>
          <div className="what__bg" aria-hidden="true" />
          <Link to={`/jogos/${idea.game.slug}`} className="what__cover" aria-label={`Abrir a ficha de ${idea.game.title}`}><CoverArt game={idea.game} lazy={false} /></Link>
          <div className="what__info">
            <div className="what__kicker"><span className="kicker">{moodDef.title}</span>{n > 0 && ideas.length > 1 && <span className="mono what__count">ideia {n} de {ideas.length}</span>}</div>
            <div className="t what__title">{idea.game.title}</div>
            <div className="muted what__meta">{idea.meta}</div>
            <ul className="what__why" aria-label="Por que pode ser para você">
              {idea.why.map((w) => <li key={w.text}><Icon name={w.icon} size={14} /><span>{w.text}</span></li>)}
            </ul>
            {asking ? (
              <div className="what__later" role="group" aria-label="Não agora">
                <span className="muted">Não agora porque…</span>
                {path === 'alcance' && mood !== 'surpresa' && <button className="btn ghost sm" onClick={() => later('filtro')}>Não combina com “{moodDef.label}”</button>}
                <button className="btn ghost sm" onClick={() => later('hoje')}>Hoje não</button>
                {idea.known && <button className="btn ghost sm" onClick={() => later('semanas')}>Não é o momento (3 semanas)</button>}
                {idea.known && idea.kind === 'estante' && idea.action === 'play' && <button className="btn ghost sm" onClick={() => later('nunca')}>Não pretendo jogar</button>}
                {!idea.known && <button className="btn ghost sm" onClick={() => later('conheco')}>Já conheço</button>}
                <button className="btn quiet sm" onClick={() => setAsking(false)}>Voltar</button>
              </div>
            ) : (
              <div className="what__actions">
                {idea.action === 'play'
                  ? <button className="btn primary" onClick={() => play(idea.game.id)}>{idea.cta}</button>
                  : <Link className="btn primary" to={`/jogos/${idea.game.slug}`}>{idea.cta}</Link>}
                <button className="btn ghost" onClick={another}>Outra ideia</button>
                <button className="btn quiet" onClick={() => setAsking(true)}>Não agora</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        nExtra > 0 ? <p className="what__empty">Nenhum jogo combina com esses filtros juntos. <button className="btn quiet sm" onClick={() => setExtra({})}>Limpar os filtros</button></p> : <p className="what__empty">{empty ?? <>Nada por enquanto, e tudo bem. <Link to="/colecao">Adicione jogos à estante</Link> para receber ideias.</>}</p>
      )}
      {notice && <p className="what__notice muted" role="status">{notice}</p>}
      {alt >= 3 && <IndecisoBuddy />}
    </section>
  );
}
