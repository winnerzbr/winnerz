/**
 * "O que jogar hoje?": recomendação pontuada, explicável e feita só com o que a pessoa registrou.
 *
 * 1. O perfil de gosto é montado na hora: gêneros e temas do que ela zerou, favoritou, avaliou bem ou disse
 *    "Adorei" pesam a favor; o que largou ou "não encaixou" pesa contra. Também entram estúdios e séries
 *    terminadas, as plataformas em que mais joga, o tamanho das sessões, a hora do dia, as companhias e o
 *    que a descansou. Nada vira rótulo permanente: muda conforme ela joga.
 * 2. Cada jogo ao alcance recebe pontos por cada motivo que se aplica (e ao filtro escolhido). Os motivos
 *    viram as frases do "Por que pode ser para você?".
 * 3. A ordem tem uma semente do dia e varia os gêneros entre uma ideia e a seguinte; o que foi pulado
 *    com "Outra ideia" nos últimos dias perde peso.
 */
import type { Game, ID, State } from '../data/types';
import { gameDna, fmtHours, type Dna } from './dna';
import { pt } from './igdbPt';
import { shortPlatform } from './platforms';
import { parts } from './memory';
import { NOT_FIT } from './sessions';

export const MOODS = [
  { id: 'pouco', label: 'Tenho pouco tempo', title: 'Para um tempinho' },
  { id: 'noite', label: 'Uma noite inteira', title: 'Para uma noite inteira' },
  { id: 'historia', label: 'Viver uma história', title: 'Para viver uma história' },
  { id: 'desafio', label: 'Um desafio', title: 'Para um desafio' },
  { id: 'relaxar', label: 'Para relaxar', title: 'Para relaxar' },
  { id: 'alguem', label: 'Com alguém', title: 'Para jogar com alguém' },
  { id: 'diferente', label: 'Algo diferente', title: 'Fora do seu padrão' },
  { id: 'surpresa', label: 'Surpreenda-me', title: 'Uma surpresa' },
] as const;
export type MoodId = (typeof MOODS)[number]['id'];

export type Vibe = { relax: number; challenge: number; intensity: number; story: number; short: number; note?: string | null };
export type Reason = { icon: string; text: string };
export type Idea = {
  game: Game;
  meta: string;
  why: Reason[];
  cta: string;
  action: 'play' | 'open';
  known: boolean;
  score: number;
  kind: 'andamento' | 'pausado' | 'estante';
};

/* ---- Perfil de gosto ------------------------------------------------------------------------- */

export type Taste = {
  /** Peso por gênero/tema (normalizado, português). Positivo gosta; negativo não encaixou. */
  tags: Map<string, number>;
  /** Como chamar o motivo de cada tag: o que mais zerou, favoritou, avaliou bem... */
  tagWhy: Map<string, string>;
  topGenres: string[];
  studios: Map<string, { game: string; how: string }>;
  /** Primeiras palavras do título dos jogos zerados (séries). */
  series: Map<string, string>;
  platforms: Map<string, number>;
  topPlatform?: string;
  medianMinutes: number | null;
  /** Período em que mais joga: 0 madrugada, 1 manhã, 2 tarde, 3 noite. */
  period: number | null;
  companions: string[];
  /** Jogos que descansaram (+) ou não (−), pela intenção da sessão. */
  rest: Map<ID, number>;
  /** Último sentimento por Jornada. */
  lastFeeling: Map<ID, string>;
  /** Nota que a pessoa deu (0..10) por jogo. */
  myRating: Map<ID, number>;
  loved: Set<ID>;
  finished: Set<ID>;
  dropped: Set<ID>;
};

const currentHistory = (s: State, journeyId: ID) => { const hs = s.histories.filter((h) => h.journeyId === journeyId).sort((a, b) => a.ordinal - b.ordinal); return hs.find((h) => h.state === 'ativa' || h.state === 'pausada') ?? hs[hs.length - 1] ?? null; };
const isOpenState = (st?: string) => st === 'ativa' || st === 'pausada';
const lastNote = (s: State, journeyId: ID) => s.sessions.filter((x) => x.journeyId === journeyId && x.note && x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const tagsOf = (g: Game): string[] => {
  const out = new Set<string>();
  for (const raw of [...(g.genres ?? '').split(/,\s*| e |\//), ...(g.themes ?? [])]) {
    const t = raw.trim(); if (!t || t === 'Indie') continue;
    out.add(pt(t));
  }
  return [...out];
};
const seriesKey = (title: string) => {
  const w = norm(title).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((x) => x && !['the', 'of', 'a', 'an', 'o', 'os', 'de', 'do', 'da'].includes(x));
  return w.length >= 2 ? w.slice(0, 2).join(' ') : w[0] ?? '';
};
const median = (xs: number[]) => { if (!xs.length) return null; const v = [...xs].sort((a, b) => a - b); const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

export function tasteProfile(s: State): Taste {
  const tags = new Map<string, number>(), tagWhy = new Map<string, string>();
  const add = (g: Game | undefined, w: number, why: string) => {
    if (!g) return;
    for (const t of tagsOf(g)) {
      tags.set(t, (tags.get(t) ?? 0) + w);
      if (w > 0 && (!tagWhy.has(t) || w >= 2)) tagWhy.set(t, why);
    }
  };
  const gameOfJ = (jid: ID) => { const j = s.journeys.find((x) => x.id === jid); return j ? s.games[j.gameId] : undefined; };
  const finished = new Set<ID>(), dropped = new Set<ID>(), loved = new Set<ID>();
  const studios = new Map<string, { game: string; how: string }>(), series = new Map<string, string>();
  for (const h of s.histories) {
    const g = gameOfJ(h.journeyId); if (!g) continue;
    if (h.state === 'concluida') {
      finished.add(g.id); add(g, 2, 'o que você mais zera');
      if (g.developer && !studios.has(norm(g.developer))) studios.set(norm(g.developer), { game: g.title, how: 'zerou' });
      const k = seriesKey(g.title); if (k && !series.has(k)) series.set(k, g.title);
    }
    if (h.state === 'dropada') { dropped.add(g.id); add(g, -1.5, ''); }
  }
  for (const id of s.favorites) { const g = s.games[id]; loved.add(id); add(g, 2, 'o que você favoritou'); if (g?.developer) studios.set(norm(g.developer), { game: g.title, how: 'favoritou' }); }
  const myRating = new Map<ID, number>();
  for (const r of s.reviews) if (r.mine) {
    const n = r.rating.normalized / 100; myRating.set(r.gameId, n);
    const g = s.games[r.gameId];
    if (n >= 8) { loved.add(r.gameId); add(g, 1.5, 'o que você avaliou bem'); if (g?.developer) studios.set(norm(g.developer), { game: g.title, how: `deu ${String(Math.round(n * 10) / 10).replace('.', ',')}` }); }
    else if (n <= 5) add(g, -1, '');
  }
  // Sessões: sentimento, plataforma, tamanho, horário, companhia e descanso.
  const platforms = new Map<string, number>();
  const lastFeeling = new Map<ID, string>();
  const rest = new Map<ID, number>();
  const comp = new Map<string, number>();
  const mins: number[] = [], periods = [0, 0, 0, 0];
  const platOf = (gid: ID) => s.copies.find((c) => c.gameId === gid)?.platform;
  const done = s.sessions.filter((x) => x.endedAt).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const recent = Date.now() - 180 * 86400000;
  for (const x of done) {
    const g = gameOfJ(x.journeyId); if (!g) continue;
    if (x.feeling) { lastFeeling.set(x.journeyId, x.feeling); if (x.feeling === 'Adorei') add(g, 0.6, 'o que você disse "Adorei"'); if (x.feeling === NOT_FIT) add(g, -0.5, ''); }
    if (x.intent === 'descansar' && x.intentMet) rest.set(g.id, (rest.get(g.id) ?? 0) + (x.intentMet === 'sim' ? 1 : x.intentMet === 'nao' ? -1 : 0));
    const p = platOf(g.id); if (p && Date.parse(x.startedAt) > recent) platforms.set(p, (platforms.get(p) ?? 0) + 1);
    if (x.minutes) mins.push(x.minutes);
    const h = parts(x.startedAt).h; periods[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3]++;
    for (const c of x.companions ?? []) comp.set(c, (comp.get(c) ?? 0) + 1);
  }
  // Gênero próprio da catalogação também conta, de leve, como preferência.
  for (const m of Object.values(s.myGames)) if (m.genre && m.priority === 1) { const t = m.genre.trim(); tags.set(t, (tags.get(t) ?? 0) + 0.5); }
  const topGenres = [...tags].filter(([, w]) => w >= 2).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  const topPlatform = [...platforms].sort((a, b) => b[1] - a[1])[0]?.[0];
  const total = periods.reduce((a, b) => a + b, 0);
  return {
    tags, tagWhy, topGenres, studios, series, platforms, topPlatform,
    medianMinutes: median(mins), period: total >= 3 ? periods.indexOf(Math.max(...periods)) : null,
    companions: [...comp].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 4),
    rest, lastFeeling, myRating, loved, finished, dropped,
  };
}

/* ---- Memória do que já foi mostrado (só neste aparelho) --------------------------------------- */

const HKEY = 'wz.oqj.hist';
type Hist = Record<ID, { shown?: string; skipped?: number; last?: string }>;
export function loadHist(): Hist { try { return JSON.parse(localStorage.getItem(HKEY) || '{}'); } catch { return {}; } }
export function noteShown(gameId: ID, skipped = false) {
  try {
    const h = loadHist(); const e = h[gameId] ?? {};
    const today = new Date().toISOString().slice(0, 10);
    if (skipped) { e.skipped = (e.skipped ?? 0) + 1; e.last = today; } else e.shown = today;
    h[gameId] = e;
    // Esquece o que tem mais de 30 dias.
    const cut = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    for (const k of Object.keys(h)) if ((h[k].last ?? h[k].shown ?? '') < cut) delete h[k];
    localStorage.setItem(HKEY, JSON.stringify(h));
  } catch { /* só nesta visita */ }
}

/* ---- Pontuação ------------------------------------------------------------------------------- */

const PERIOD = ['de madrugada', 'de manhã', 'à tarde', 'à noite'];
const daysSince = (iso: string, now: number) => Math.floor((now - Date.parse(iso)) / 86400000);
const monthsWord = (d: number) => (d < 45 ? `${d} dias` : d < 365 ? `${Math.round(d / 30)} meses` : d < 730 ? 'mais de um ano' : `${Math.floor(d / 365)} anos`);
const since = (iso: string) => `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`;

/** Semente do dia: a mesma ordem durante o dia, outra amanhã. */
export function daySeed(now = Date.now()) { return Number(new Date(now).toISOString().slice(0, 10).replace(/-/g, '')) % 9973; }
function rnd(seed: number) { let t = seed || 1; return () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

type Cand = { game: Game; kind: Idea['kind']; dna: Dna; journeyId?: ID; progress?: number; note?: string; lastAt?: string; paused?: string; since?: string; arrivedDays?: number; platform?: string; copyKind?: string; wishedFor?: number };

function candidates(s: State, excludeJourneyId: string | undefined, today: string, now: number): Cand[] {
  const out: Cand[] = [];
  const lent = new Set((s.loans ?? []).filter((l) => !l.returnedOn && l.copyId).map((l) => l.copyId!));
  const notNow = (gid: ID) => { const u = s.myGames[gid]?.notNowUntil; return !!u && u > today; };
  const started = new Set<ID>();
  for (const j of s.journeys) {
    started.add(j.gameId);
    const g = s.games[j.gameId]; if (!g || j.id === excludeJourneyId || notNow(g.id)) continue;
    const h = currentHistory(s, j.id); if (!h || !isOpenState(h.state)) continue;
    if (s.sessions.some((x) => x.journeyId === j.id && !x.endedAt)) continue;
    const last = [...s.sessions].filter((x) => x.journeyId === j.id && x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    out.push({ game: g, kind: h.state === 'pausada' ? 'pausado' : 'andamento', dna: gameDna(g, s), journeyId: j.id, progress: h.progress, note: lastNote(s, j.id)?.note, lastAt: last?.endedAt ?? last?.startedAt, paused: h.note ?? j.pausedNote, platform: s.copies.find((c) => c.gameId === g.id)?.platform });
  }
  const seen = new Set<ID>();
  for (const c of s.copies) {
    const g = s.games[c.gameId];
    if (!g || seen.has(g.id) || started.has(g.id) || lent.has(c.id) || s.myGames[g.id]?.wontPlay || notNow(g.id)) continue;
    seen.add(g.id);
    const when = c.purchasedOn ?? c.createdAt?.slice(0, 10);
    const wish = s.wishes.find((w) => w.gameId === g.id);
    out.push({ game: g, kind: 'estante', dna: gameDna(g, s), since: when, arrivedDays: when ? daysSince(`${when}T12:00:00-03:00`, now) : undefined, platform: c.platform, copyKind: c.kind, wishedFor: wish ? 1 : undefined });
  }
  return out;
}

function score(c: Cand, mood: MoodId, t: Taste, s: State, hist: Hist, now: number, vibe?: Vibe): { score: number; why: Reason[] } | null {
  const why: Reason[] = []; let sc = 0;
  const v = vibe;
  const add = (w: number, icon: string, text: string) => { sc += w; if (text) why.push({ icon, text }); };
  const g = c.game, d = c.dna, m = s.myGames[g.id];
  const tags = tagsOf(g);
  const fav = t.topGenres.find((x) => tags.includes(x));
  const tagScore = tags.reduce((a, x) => a + (t.tags.get(x) ?? 0), 0) / Math.max(1, tags.length);
  const dev = g.developer ? t.studios.get(norm(g.developer)) : undefined;
  const serie = t.series.get(seriesKey(g.title));

  // Gosto (vale para todos os filtros, exceto "Algo diferente", que inverte).
  if (mood !== 'diferente') {
    if (fav) add(2, 'coracao', `${cap(fav)} é ${t.tagWhy.get(fav) ?? 'o que você mais joga'}.`);
    else if (tagScore > 0.5) add(1, 'coracao', '');
    if (tagScore < -0.5) sc -= 2;
    if (dev && dev.game !== g.title) add(1.5, 'brilho', `Do mesmo estúdio de ${dev.game}, que você ${dev.how}.`);
    if (serie && serie !== g.title && !t.finished.has(g.id)) add(1.5, 'jornada', `Parece continuar ${serie}, que você zerou.`);
  } else {
    if (fav || tagScore > 0.5) sc -= 2;
    const novel = tags.find((x) => !t.tags.has(x));
    if (novel) add(2, 'lampada', `Diferente do que você costuma jogar: ${novel.toLowerCase()}.`);
    else return null;
  }
  // Sua catalogação.
  if (m?.priority === 1) add(1.5, 'check', 'Está na sua lista de prioridade alta.');
  if (m?.priority === 3) sc -= 1;
  if (m?.note) add(0.8, 'caneta', `Você anotou: “${m.note.slice(0, 80)}${m.note.length > 80 ? '…' : ''}”.`);
  if (c.kind === 'estante' && c.wishedFor) add(1, 'desejo', 'Foi um desejo seu e agora está na estante.');
  // Em andamento: o que já está vivo.
  if (c.kind === 'andamento') {
    if (c.progress != null && c.progress >= 80 && c.progress < 100) add(2, 'jornada', `Faltam só ${100 - c.progress}% para zerar.`);
    else if (c.note) add(1.2, 'mensagem', `Seu último recado: “${c.note.slice(0, 90)}${c.note.length > 90 ? '…' : ''}”`);
    else add(0.8, 'jornada', 'Você já está no meio desta história. É o retorno mais fácil.');
    const f = c.journeyId && t.lastFeeling.get(c.journeyId);
    if (f === 'Adorei' || f === 'Quero continuar') add(1, 'coracao', `Da última vez você disse “${f}”.`);
    if (f === NOT_FIT) sc -= 1.5;
    if (c.lastAt) { const dd = daysSince(c.lastAt, now); if (dd >= 14 && dd < 120 && d.fits.relearn) add(0.3, 'relogio', 'Parado há um tempo; reserve uns minutos para reaprender os comandos.'); else if (dd >= 14 && dd < 120) add(0.6, 'relogio', `Faz ${monthsWord(dd)} que você não volta. Dá para retomar de onde parou.`); }
  }
  if (c.kind === 'pausado') add(0.4, 'relogio', c.paused ? `Você pausou: “${c.paused.slice(0, 80)}”. Dá para voltar quando quiser.` : 'Você pausou sem pressa. Dá para voltar de onde parou.');
  // Estante: espera e chegada.
  if (c.kind === 'estante') {
    if (c.arrivedDays != null && c.arrivedDays <= 30) add(1.5, 'estante', c.arrivedDays <= 1 ? 'Acabou de chegar na sua estante.' : `Chegou há ${c.arrivedDays} dias e ainda não foi aberto.`);
    else if (c.arrivedDays != null && c.arrivedDays >= 365 && c.since) add(0.8, 'estante', `Na estante desde ${since(c.since)} e nunca aberto.`);
    else if (!why.length) add(0.3, 'estante', 'Está ao seu alcance e você ainda não começou.');
    if (c.copyKind === 'assinatura') add(0.3, 'relogio', 'Está na assinatura: pode sair do catálogo um dia.');
  }
  // Plataforma em que você mais joga.
  if (c.platform && t.topPlatform && c.platform === t.topPlatform && t.platforms.size > 1) add(0.6, 'jogos', `No ${shortPlatform(c.platform)}, onde você mais jogou nos últimos meses.`);
  // Filtro escolhido.
  const h = d.hours;
  switch (mood) {
    case 'pouco':
      if (v && v.short >= 2) add(2.5, 'relogio', v.note && v.short === 3 ? v.note : 'Rende em sessões curtas, pelo que a comunidade diz.');
      else if (v && v.short === 0) return null;
      else if (d.fits.short) add(2.5, 'relogio', 'Bom em sessões curtas: dá para parar a qualquer hora.');
      else if (h != null && h <= 8) add(1.5, 'relogio', `Curto: cerca de ${fmtHours(h)} do começo ao fim.`);
      else if (c.kind === 'andamento' && c.progress != null && c.progress >= 80) add(1, 'relogio', '');
      else sc -= 3;
      if (t.medianMinutes != null && t.medianMinutes <= 60 && d.fits.short) add(0.5, 'relogio', `Cabe numa sessão sua (costumam ter uns ${Math.round(t.medianMinutes)} min).`);
      break;
    case 'noite':
      if (v && v.story >= 2 && v.short <= 1) add(2.5, 'play', v.note || 'Rende numa noite sem pressa, puxado pela história.');
      else if (d.fits.long || (h != null && h >= 20)) add(2, 'play', d.fits.story ? 'Rende numa noite sem pressa, puxado pela história.' : 'Longo, bom para mergulhar com tempo.');
      else if (d.fits.short) sc -= 1.5;
      if (c.kind === 'pausado') add(1, 'play', '');
      break;
    case 'historia': {
      const strong = tags.some((x) => /rpg|visual novel|point-and-click|drama|mist[eé]rio|romance|narrativ|aventura gr[aá]fica/i.test(x));
      if (v && v.story <= 0) return null;
      if (v && v.story >= 2) add(3 + (v.story - 2), 'carta', v.note || 'A história é o centro, pelo que a comunidade diz.');
      else if (v && v.story === 1) add(1, 'carta', 'Tem história, mas ela não é o centro.');
      else if (strong) add(3, 'carta', 'Puxado pela história: gênero e temas indicam uma narrativa contínua.');
      else if (d.fits.story) add(1.5, 'carta', 'Aventura: costuma ter uma história para seguir.');
      else return null;
      if (c.kind === 'andamento' && c.note) add(0.5, 'carta', '');
      break;
    }
    case 'desafio':
      if (v && v.challenge <= 0) return null;
      if (v && v.challenge >= 2) add(3 + (v.challenge - 2), 'brilho', v.note || 'Conhecido pela dificuldade, pelo que a comunidade diz.');
      else if (v && v.challenge === 1) add(0.8, 'brilho', 'Pede alguma habilidade, sem ser dos mais difíceis.');
      else if (d.fits.horror || d.fits.relearn || tags.some((x) => /luta|estrat|t[aá]tic|souls|roguel|plataforma|tiro|corrida|arcade/i.test(x))) add(2.5, 'brilho', d.fits.relearn ? 'Cheio de sistemas para dominar.' : 'Pede reflexo e repetição: o tipo de jogo que testa a habilidade.');
      else if (h != null && h >= 40) add(1, 'brilho', 'Longo e exigente para ir até o fim.');
      else return null;
      if (c.journeyId && t.lastFeeling.get(c.journeyId) === 'Quero continuar') add(0.5, 'brilho', '');
      break;
    case 'relaxar': {
      const r = t.rest.get(g.id) ?? 0;
      if (r > 0) add(3, 'coracao', 'Já te descansou antes, quando você jogou para descansar.');
      else if (r < 0) return null;
      if (v) {
        // A comunidade manda: intenso ou difícil demais não é para relaxar (a não ser que já tenha te descansado).
        if ((v.intensity >= 3 || v.challenge >= 3 || (v.relax === 0 && v.intensity >= 2)) && r <= 0) return null;
        if (v.relax >= 2) add(2 + (v.relax - 2), 'lampada', v.note || 'Tranquilo de jogar, pelo que a comunidade diz.');
        else if (v.relax === 1 && v.intensity <= 1) add(0.6, 'lampada', 'Calmo, mesmo sem ser dos mais relaxantes.');
        else sc -= 1.5;
      } else if (d.fits.light) add(1.5, 'lampada', 'Leve: dá para jogar sem pensar muito.');
      else if (d.fits.horror || d.fits.relearn || tags.some((x) => /tiro|shooter|luta|terror|souls/i.test(x))) sc -= 2.5;
      else sc -= 0.5;
      if (c.kind === 'andamento' && c.progress != null && c.progress >= 90) sc += 0.5;
      if (t.period != null && c.lastAt && parts(c.lastAt).h >= 18 && t.period === 3) add(0.3, 'relogio', `Você costuma jogar ${PERIOD[3]}; este já foi companhia nesse horário.`);
      break;
    }
    case 'alguem':
      if (!d.fits.together) return null;
      add(2.5, 'pessoas', d.traits.find((x) => x.key === 'junto')?.detail ?? 'Dá para jogar junto.');
      if (t.companions.length) add(0.8, 'pessoas', `Você costuma jogar com ${t.companions.slice(0, 2).join(' e ')}; chame para esta.`);
      break;
    case 'diferente':
      if (c.kind !== 'estante') return null;
      break;
    case 'surpresa':
      break;
  }
  // O que foi pulado nos últimos dias perde peso; o que apareceu ontem não volta primeiro.
  const e = hist[g.id];
  if (e?.skipped) sc -= Math.min(3, e.skipped);
  if (e?.shown && daysSince(`${e.shown}T12:00:00-03:00`, now) <= 2) sc -= 1;
  if (t.dropped.has(g.id)) sc -= 1;
  return { score: sc, why };
}

const metaOf = (c: Cand): string => {
  const d = c.dna;
  const hours = d.hours != null ? ` Cerca de ${fmtHours(d.hours)} para zerar${d.hoursSource === 'voce' ? ', pela sua estimativa' : ', pela média de quem já jogou'}.` : '';
  if (c.kind === 'andamento') return `Em andamento${c.progress != null ? `, ${c.progress}%` : ''}.${c.lastAt ? ` Última sessão ${monthsAgo(c.lastAt)}.` : ''}`;
  if (c.kind === 'pausado') return `Pausado.${hours}`;
  return `${c.platform ? shortPlatform(c.platform) : ''}${c.copyKind ? `, ${c.copyKind === 'fisico' ? 'mídia física' : c.copyKind === 'assinatura' ? 'assinatura' : 'digital'}` : ''}. Na sua estante, ainda sem História.${hours}`;
};
const monthsAgo = (iso: string) => { const dd = Math.floor((Date.now() - Date.parse(iso)) / 86400000); return dd <= 0 ? 'hoje' : dd === 1 ? 'ontem' : dd < 30 ? `há ${dd} dias` : `há ${monthsWord(dd)}`; };

/** Os jogos ao alcance (para pedir o clima dos que faltam). */
export function reachableGames(s: State, excludeJourneyId?: string, now = Date.now()): Game[] {
  return candidates(s, excludeJourneyId, new Date(now).toISOString().slice(0, 10), now).map((c) => c.game);
}

/** As ideias "ao meu alcance", pontuadas e explicadas, na ordem do dia. */
export function recommend(s: State, mood: MoodId, opts: { excludeJourneyId?: string; today?: string; now?: number; hist?: Hist; seed?: number; vibe?: (id: ID) => Vibe | undefined } = {}): Idea[] {
  const now = opts.now ?? Date.now();
  const today = opts.today ?? new Date(now).toISOString().slice(0, 10);
  const hist = opts.hist ?? loadHist();
  const t = tasteProfile(s);
  const cands = candidates(s, opts.excludeJourneyId, today, now);
  const r = rnd(opts.seed ?? daySeed(now));
  const scored = cands.map((c) => { const x = score(c, mood, t, s, hist, now, opts.vibe?.(c.game.id)); return x && { c, ...x, jitter: r() }; }).filter((x): x is NonNullable<typeof x> => !!x);
  if (mood === 'surpresa') scored.sort((a, b) => a.jitter - b.jitter);
  else scored.sort((a, b) => b.score + b.jitter * 1.2 - (a.score + a.jitter * 1.2));
  // Variedade: evita duas ideias seguidas do mesmo gênero principal.
  const out: typeof scored = [];
  const pool = [...scored];
  while (pool.length && out.length < 40) {
    const lastTag = out.length ? tagsOf(out[out.length - 1].c.game)[0] : null;
    const i = lastTag ? pool.findIndex((x) => tagsOf(x.c.game)[0] !== lastTag) : 0;
    out.push(pool.splice(i < 0 || i > 3 ? 0 : i, 1)[0]);
  }
  return out.map(({ c, score: sc, why }) => ({
    game: c.game, kind: c.kind, score: sc,
    meta: metaOf(c),
    why: why.filter((w) => w.text).slice(0, 3).length ? why.filter((w) => w.text).slice(0, 3) : [{ icon: 'estante', text: 'Está ao seu alcance. Ter não obriga, mas pode ser hoje.' }],
    cta: c.kind === 'andamento' ? 'Continuar' : c.kind === 'pausado' ? 'Retomar' : 'Começar Jornada',
    action: 'play', known: true,
  }));
}
