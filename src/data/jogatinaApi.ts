/**
 * Jogatinas (Etapa 6, entrega C): a base de "jogar junto". Um jogo, dia e hora, vagas, Vou/Talvez/Não vou,
 * perguntas antes e memórias depois ("eu estava lá"). Pode ser solta, de uma comunidade ou da agenda de um clube.
 * Com conta, tudo passa pelas funções do banco (migração 0031). Na demonstração, fica neste navegador.
 */
import { getState } from './store';
import { communityApi, demoGameMini, demoPersonRef, demoReactions, type GameMini, type NewsItem, type PersonRef, type ReplyNews } from './communityApi';
import { demoClubRef, okRpc, type ClubAccess, type GroupMessage } from './clubApi';
import { mentionsOf } from '../lib/postText';
import { DEMO_PEOPLE } from './demoPeople';

export type Rsvp = 'vou' | 'talvez' | 'nao';
export interface Jogatina {
  id: string; title: string; description: string; game: GameMini | null; startsAt: string; durationMin: number | null; platform?: string | null;
  maxPeople?: number | null; access: ClubAccess; liveUrl?: string | null; ended: boolean; canceled: boolean; now: boolean;
  community?: { slug: string; name: string } | null; club?: { slug: string; name: string } | null; createdAt: string; hidden: boolean;
  owner?: PersonRef | null; going: number; maybe: number; wasThere: number; me?: { rsvp: Rsvp; wasThere: boolean } | null; inviteCode?: string | null;
  /** Quem convidou você (se alguém convidou) e quantos convidados ainda não responderam. */
  invitedBy?: PersonRef | null; invited?: number;
}
export interface JogPerson extends PersonRef { rsvp: Rsvp; wasThere: boolean; joinedAt: string; journey?: { progress: number | null; completed: boolean | null } | null }
export interface JogInvite extends PersonRef { by?: PersonRef | null; at: string }
export interface InviteResult { sent: string[]; already: string[]; notFound: string[] }
export interface JogatinaFull extends Jogatina { locked: false; people: JogPerson[]; messages: GroupMessage[]; invites: JogInvite[] }
export interface JogatinaLocked { locked: true; id: string; title: string; access: ClubAccess; startsAt: string; game: GameMini | null; owner?: PersonRef | null }
export interface JogatinaDraft {
  title: string; description: string; gameId: string | null; startsAt: string | null; durationMin: number | null; platform: string | null;
  maxPeople: number | null; access: ClubAccess; liveUrl: string | null; communityId: string | null; clubId: string | null; newCode?: boolean;
}
/** "Clube Retrô" fica como está; "Elden Ring sem pressa" vira "Clube Elden Ring sem pressa". */
export const clubLabel = (name: string) => (/^clube\b/i.test(name) ? name : `Clube ${name}`);
export const RSVP_LABEL: Record<Rsvp, string> = { vou: 'Vou', talvez: 'Talvez', nao: 'Não vou' };
export const JOG_ACCESS: { k: ClubAccess; label: string; hint: string }[] = [
  { k: 'aberto', label: 'Entrada aberta', hint: 'Aparece na Praça e na ficha do jogo; qualquer pessoa confirma.' },
  { k: 'amigos', label: 'Só amigos', hint: 'Só os seus amigos veem e confirmam.' },
  { k: 'convite', label: 'Por convite', hint: 'Não aparece em lista nenhuma; vem quem tem o link.' },
];

const MSG: Record<string, string> = {
  name_invalid: 'O nome da jogatina precisa ter de 3 a 80 caracteres.',
  text_long: 'A descrição passou de 500 caracteres (ou a plataforma de 40).',
  game_needed: 'Escolha o jogo da jogatina.',
  date_needed: 'Escolha o dia e a hora.',
  date_past: 'Essa data já passou.',
  max_invalid: 'As vagas vão de 2 a 64.',
  club_limit: 'Você já marcou 10 jogatinas hoje. Volte amanhã.',
  club_closed: 'Essa jogatina é só para amigos de quem marcou ou por convite.',
  club_full: 'As vagas acabaram. Você ainda pode marcar Talvez.',
  club_ended: 'Essa jogatina já aconteceu.',
  jogatina_canceled: 'Essa jogatina foi cancelada.',
  jogatina_not_started: 'Dá para marcar "eu estava lá" depois que a jogatina começar.',
  owner_leave: 'Quem marcou a jogatina não pode sair dela. Se não for mais acontecer, cancele.',
  not_member: 'Confirme presença (Vou ou Talvez) para participar da conversa.',
  not_owner: 'Só quem marcou a jogatina pode fazer isso.',
  rsvp_invalid: 'Resposta inválida.',
  invite_not_allowed: 'Responda Vou ou Talvez para convidar outras pessoas.',
  invite_too_many: 'No máximo 20 pessoas por vez.',
  invite_limit: 'Você já mandou muitos convites hoje. Volte amanhã.',
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => okRpc(await (await client()).rpc(fn, args), MSG) as T;
const draftJson = (d: JogatinaDraft) => ({
  title: d.title, description: d.description, gameId: d.gameId, startsAt: d.startsAt, durationMin: d.durationMin ?? '', platform: d.platform ?? '',
  maxPeople: d.maxPeople ?? '', access: d.access, liveUrl: d.liveUrl ?? '', communityId: d.communityId ?? '', clubId: d.clubId ?? '', newCode: d.newCode ?? false,
});
export type JogFilter = 'proximas' | 'minhas' | 'passadas';
export interface JogScope { game?: string; club?: string; community?: string; limit?: number }

export const jogatinaApi = {
  async list(filter: JogFilter = 'proximas', scope: JogScope = {}): Promise<Jogatina[]> {
    if (!supa()) return demo.list(filter, scope);
    if (filter === 'minhas' && !getState().profile) return [];
    return (await rpc<Jogatina[] | null>('jogatina_list', { p_filter: filter, p_game: scope.game ?? null, p_club: scope.club ?? null, p_community: scope.community ?? null, p_limit: scope.limit ?? 40 })) ?? [];
  },
  async get(id: string, code?: string | null): Promise<JogatinaFull | JogatinaLocked | null> {
    if (!/^[0-9a-f-]{36}$|^j-/.test(id)) return null;
    if (!supa()) return demo.get(id);
    return rpc<JogatinaFull | JogatinaLocked | null>('jogatina_get', { p_id: id, p_code: code ?? null });
  },
  async create(d: JogatinaDraft): Promise<Jogatina> {
    if (!supa()) return demo.create(d);
    return rpc<Jogatina>('jogatina_create', { p: draftJson(d) });
  },
  async update(id: string, d: JogatinaDraft): Promise<Jogatina> {
    if (!supa()) return demo.update(id, d);
    return rpc<Jogatina>('jogatina_update', { p_id: id, p: draftJson(d) });
  },
  async cancel(id: string, on: boolean): Promise<Jogatina> {
    if (!supa()) return demo.cancel(id, on);
    return rpc<Jogatina>('jogatina_cancel', { p_id: id, p_on: on });
  },
  /** Vou / Talvez / Não vou; null tira da lista. */
  async rsvp(id: string, code: string | null, r: Rsvp | null): Promise<Jogatina> {
    if (!supa()) return demo.rsvp(id, r);
    return rpc<Jogatina>('jogatina_rsvp', { p_id: id, p_code: code, p_rsvp: r });
  },
  /** Convida pelo @ (com ou sem a arroba). A pessoa vê a jogatina e recebe o aviso no site. */
  async invite(id: string, handles: string[]): Promise<InviteResult> {
    const clean = [...new Set(handles.map((h) => h.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))];
    if (!clean.length) return { sent: [], already: [], notFound: [] };
    if (!supa()) return demo.invite(id, clean);
    return rpc<InviteResult>('jogatina_invite', { p_id: id, p_handles: clean });
  },
  async wasThere(id: string, on: boolean): Promise<Jogatina> {
    if (!supa()) return demo.wasThere(id, on);
    return rpc<Jogatina>('jogatina_was_there', { p_id: id, p_on: on });
  },
  async message(id: string, parentId: string | null, body: string, question: boolean, images: string[]): Promise<GroupMessage> {
    if (!supa()) return demo.message(id, parentId, body, question, images);
    return rpc<GroupMessage>('jogatina_message', { p_id: id, p_parent: parentId, p_body: body, p_question: question, p_images: images });
  },
  async editMessage(id: string, body: string): Promise<void> {
    if (!supa()) return demo.editMessage(id, body);
    await rpc('club_message_edit', { p_id: id, p_body: body });
  },
  async deleteMessage(id: string): Promise<void> {
    if (!supa()) return demo.deleteMessage(id);
    const imgs = await rpc<string[] | null>('club_message_delete', { p_id: id });
    if (imgs?.length) await communityApi.removeImages(imgs);
  },
};

/* ------------------------------------------------------------------ */
/* Agenda: arquivo .ics                                                 */
/* ------------------------------------------------------------------ */
export function icsFor(j: Pick<Jogatina, 'id' | 'title' | 'description' | 'startsAt' | 'durationMin' | 'liveUrl' | 'game'>, origin: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const start = new Date(j.startsAt);
  const end = j.durationMin ? new Date(start.getTime() + j.durationMin * 60_000) : null;
  const url = `${origin}/jogatina/${j.id}`;
  const desc = [j.game ? `Jogo: ${j.game.title}` : '', j.description, j.liveUrl ? `Link: ${j.liveUrl}` : '', `No WinnerZ: ${url}`].filter(Boolean).join('\n');
  const fold = (line: string) => line.match(/.{1,73}/g)!.join('\r\n ');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WinnerZ//Jogatinas//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:jogatina-${j.id}@winnerz.com.br`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, end ? `DTEND:${fmt(end)}` : '',
    fold(`SUMMARY:${esc(j.title)}`), fold(`DESCRIPTION:${esc(desc)}`), fold(`URL:${url}`), j.liveUrl ? fold(`LOCATION:${esc(j.liveUrl)}`) : '',
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(j.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}
export function downloadIcs(j: Parameters<typeof icsFor>[0]) {
  const blob = new Blob([icsFor(j, location.origin)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `jogatina-${j.id.slice(0, 8)}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Agora (com 15 minutos de antecedência) até o fim previsto. */
export function jogatinaNow(j: Pick<Jogatina, 'startsAt' | 'durationMin' | 'canceled'>, now = Date.now()): boolean {
  if (j.canceled) return false;
  const s = Date.parse(j.startsAt);
  return now >= s - 15 * 60_000 && now <= jogatinaEnd(j);
}
/** Quando acaba. Sem hora para acabar, conta como encerrada 12 horas depois de começar. */
export const OPEN_END_MIN = 720;
export const jogatinaEnd = (j: Pick<Jogatina, 'startsAt' | 'durationMin'>) => Date.parse(j.startsAt) + (j.durationMin ?? OPEN_END_MIN) * 60_000;

/* ------------------------------------------------------------------ */
/* Demonstração                                                         */
/* ------------------------------------------------------------------ */
type DPerson = { id: string; rsvp: Rsvp; wasThere: boolean; joinedAt: string };
type DJog = Omit<Jogatina, 'game' | 'owner' | 'going' | 'maybe' | 'wasThere' | 'me' | 'ended' | 'now' | 'inviteCode' | 'club' | 'canceled'> & { gameId: string; ownerId: string; clubId: string | null; people: DPerson[]; extra: number; canceledAt?: string | null };
type DMsg = { id: string; jog: string; parentId: string | null; author: string; question: boolean; body: string; images: string[]; createdAt: string; editedAt?: string | null; deletedAt?: string | null };
type DInvite = { jog: string; user: string; by: string; at: string };
type DB = { v: number; jogs: DJog[]; msgs: DMsg[]; invites: DInvite[] };
const KEY = 'wz.demo.jogatinas';
const VERSION = 3;
const ME = 'demo-me';
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const rid = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
/** Hoje às 21h (horário de Brasília), ou amanhã se já passou das 23h. */
function tonight(): string {
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const t = Date.parse(`${day}T21:00:00-03:00`);
  return new Date(t + 2 * 3_600_000 < Date.now() ? t + 86_400_000 : t).toISOString();
}
/** O próximo sábado às 21h. */
/** Há `d` dias, às 21h (horário de Brasília). */
function daysAgoAt21(d: number): string {
  const x = new Date(Date.now() - d * 86_400_000);
  return new Date(`${x.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })}T21:00:00-03:00`).toISOString();
}
function nextSaturday(): string {
  const now = new Date();
  for (let d = 1; d <= 7; d++) {
    const x = new Date(now.getTime() + d * 86_400_000);
    if (x.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }) === 'Sat') return new Date(`${x.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })}T21:00:00-03:00`).toISOString();
  }
  return new Date(now.getTime() + 3 * 86_400_000).toISOString();
}

function seed(): DB {
  const p = (id: string, rsvp: Rsvp = 'vou', more: Partial<DPerson> = {}): DPerson => ({ id, rsvp, wasThere: false, joinedAt: hoursAgo(24 * 2), ...more });
  const base = { platform: null, maxPeople: null, access: 'aberto' as ClubAccess, liveUrl: null, community: null, clubId: null, hidden: false, extra: 0, durationMin: 120 };
  const jogs: DJog[] = [
    { ...base, id: 'j-astro', title: 'Noite de Astro Bot', description: 'Fechando o último planeta na live. Cada um no seu console, comentando aqui.', gameId: 'astro', startsAt: tonight(),
      platform: 'PS5', maxPeople: 8, liveUrl: 'https://www.twitch.tv/winnerz', community: { slug: 'playstation', name: 'PlayStation' }, createdAt: hoursAgo(30), ownerId: ME,
      people: [p(ME), p('demo-duda'), p('demo-rafa'), p('demo-lu'), p('demo-carol', 'talvez')] },
    { ...base, id: 'j-agora', title: 'Cooperativo na Liurnia', description: 'Ajudando quem travou no Rennala. Senha da invocação no chat.', gameId: 'elden', startsAt: hoursAgo(0.5), durationMin: 180,
      platform: 'PC', maxPeople: 4, createdAt: hoursAgo(20), ownerId: 'demo-duda', people: [p('demo-duda'), p('demo-carol')] },
    { ...base, id: 'j-retro', title: 'Killzone 2: multiplayer de sábado', description: 'O fan-server de Killzone 2. Quem tiver PS3 traz; quem não tiver, assiste na live.', gameId: 'kz2', startsAt: nextSaturday(), durationMin: 150,
      platform: 'PS3', clubId: 'k-retro', createdAt: hoursAgo(24 * 4), ownerId: 'demo-carol', people: [p('demo-carol'), p(ME, 'talvez'), p('demo-rafa')] },
    { ...base, id: 'j-rennala', title: 'Rennala em cooperativo', description: 'Quem estiver na parte 2 do clube e quiser companhia contra a Rennala.', gameId: 'elden', startsAt: new Date(Date.parse(nextSaturday()) - 6 * 3_600_000).toISOString(),
      platform: 'PS5', maxPeople: 4, clubId: 'k-elden', createdAt: hoursAgo(20), ownerId: 'demo-rafa', people: [p('demo-rafa'), p('demo-duda'), p('demo-carol', 'talvez')] },
    { ...base, id: 'j-derby', title: 'Derby de sexta', description: 'Uma noite de Destruction Derby no emulador, quem bater menos paga o próximo.', gameId: 'dderby', startsAt: daysAgoAt21(6), durationMin: 180,
      clubId: 'k-retro', createdAt: hoursAgo(24 * 9), ownerId: 'demo-rafa', extra: 2,
      people: [p('demo-rafa', 'vou', { wasThere: true }), p(ME, 'vou', { wasThere: true }), p('demo-carol', 'nao')] },
  ];
  const x = (id: string, jog: string, author: string, h: number, body: string, more: Partial<DMsg> = {}): DMsg => ({ id, jog, parentId: null, author, question: false, body, images: [], createdAt: hoursAgo(h), ...more });
  const msgs: DMsg[] = [
    x('n1', 'j-astro', 'demo-lu', 20, 'Precisa ter zerado? Comecei ontem.', { question: true }),
    x('n2', 'j-astro', ME, 19, 'Não! Só vem. Quem estiver no começo joga as fases que tiver. @lu', { parentId: 'n1' }),
    x('n3', 'j-astro', 'demo-duda', 18, 'Vou estar lá! Ainda me falta o planeta de gelo.'),
    x('a1', 'j-agora', 'demo-duda', 0.4, 'Começando! Senha de invocação: winnerz.'),
    x('k1', 'j-retro', 'demo-carol', 24 * 3, 'Alguém sabe se o fan-server ainda pede a atualização 1.31?', { question: true }),
    x('d0', 'j-derby', 'demo-rafa', 24 * 8, 'Emulador ou console original?', { question: true }),
    x('d1', 'j-derby', 'demo-rafa', 24 * 5 + 1, 'Que noite! Bati o recorde de carros destruídos no estádio.', { images: ['/demo/scene-dderby.webp'] }),
    x('d2', 'j-derby', ME, 24 * 5, 'Valeu pela noite, rafa. Na próxima eu levo o volante.'),
  ];
  const invites: DInvite[] = [{ jog: 'j-agora', user: ME, by: 'demo-duda', at: hoursAgo(1) }];
  return { v: VERSION, jogs, msgs, invites };
}
function loadDb(): DB {
  try { const x = JSON.parse(localStorage.getItem(KEY) || 'null') as DB | null; if (x && x.v === VERSION) return x; } catch { /* começa de novo */ }
  const s = seed(); saveDb(s); return s;
}
function saveDb(db: DB) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { throw new Error('O navegador ficou sem espaço para a demonstração. Use imagens menores ou recomece a demonstração.'); } }
function err(code: string): never { throw new Error(MSG[code] ?? code); }

function out(j: DJog): Jogatina {
  const me = j.people.find((p) => p.id === ME);
  const inv = loadDb().invites.filter((i) => i.jog === j.id && !j.people.some((p) => p.id === i.user));
  const mine = loadDb().invites.find((i) => i.jog === j.id && i.user === ME);
  const club = j.clubId ? demoClubRef(j.clubId) : null;
  const canceled = !!j.canceledAt;
  return {
    id: j.id, title: j.title, description: j.description, game: demoGameMini(j.gameId), startsAt: j.startsAt, durationMin: j.durationMin, platform: j.platform,
    maxPeople: j.maxPeople, access: j.access, liveUrl: j.liveUrl, ended: jogatinaEnd(j) < Date.now(), canceled,
    now: jogatinaNow({ startsAt: j.startsAt, durationMin: j.durationMin, canceled }), community: j.community, club: club ? { slug: club.slug, name: club.name } : null,
    createdAt: j.createdAt, hidden: j.hidden, owner: demoPersonRef(j.ownerId),
    going: j.people.filter((p) => p.rsvp === 'vou').length + j.extra, maybe: j.people.filter((p) => p.rsvp === 'talvez').length,
    wasThere: j.people.filter((p) => p.wasThere).length, me: me ? { rsvp: me.rsvp, wasThere: me.wasThere } : null, inviteCode: j.ownerId === ME ? 'demo' : null,
    invitedBy: mine ? demoPersonRef(mine.by) : null, invited: inv.length,
  };
}
const inClub = (j: DJog) => !!j.clubId && !!demoClubRef(j.clubId)?.member;

/** Na demonstração, para o clube: a agenda (o que vem) e as jogatinas que já aconteceram. */
export function demoClubAgenda(clubId: string): Jogatina[] {
  return loadDb().jogs.filter((j) => j.clubId === clubId && !j.canceledAt && !j.hidden).map(out).filter((j) => !j.ended).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
export function demoClubPast(clubId: string): Jogatina[] {
  return loadDb().jogs.filter((j) => j.clubId === clubId && !j.canceledAt && !j.hidden).map(out).filter((j) => j.ended).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

const demo = {
  list(filter: JogFilter, scope: JogScope): Jogatina[] {
    const db = loadDb();
    let l = db.jogs.filter((j) => !j.hidden);
    if (scope.game) l = l.filter((j) => j.gameId === scope.game || demoGameMini(j.gameId)?.slug === scope.game);
    if (scope.club) l = l.filter((j) => j.clubId && demoClubRef(j.clubId)?.slug === scope.club);
    if (scope.community) l = l.filter((j) => j.community?.slug === scope.community);
    const o = l.map((j) => ({ j, x: out(j) }));
    const r = filter === 'minhas' ? o.filter(({ x }) => x.me || (x.invitedBy && !x.ended && !x.canceled))
      : filter === 'passadas' ? o.filter(({ j, x }) => x.ended && !x.canceled && (x.me || j.access === 'aberto'))
        : o.filter(({ j, x }) => !x.ended && !x.canceled && (j.access === 'aberto' || x.me || x.invitedBy || inClub(j)));
    const xs = r.map(({ x }) => x).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return (filter === 'passadas' ? xs.reverse() : xs).slice(0, scope.limit ?? 40);
  },
  get(id: string): JogatinaFull | null {
    const db = loadDb(); const j = db.jogs.find((x) => x.id === id);
    if (!j) return null;
    const msgs = db.msgs.filter((x) => x.jog === id && (!x.deletedAt || db.msgs.some((k) => k.parentId === x.id && !k.deletedAt)));
    return {
      ...out(j), locked: false,
      people: j.people.map((p) => ({ ...demoPersonRef(p.id), rsvp: p.rsvp, wasThere: p.wasThere, joinedAt: p.joinedAt, journey: null })),
      invites: db.invites.filter((i) => i.jog === id && !j.people.some((p) => p.id === i.user)).map((i) => ({ ...demoPersonRef(i.user), by: demoPersonRef(i.by), at: i.at })),
      messages: msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((x) => ({ id: x.id, part: 0, parentId: x.parentId, question: x.question, target: x.parentId ? 'resposta' as const : 'post' as const, body: x.deletedAt ? '' : x.body, images: x.deletedAt ? [] : x.images, deleted: !!x.deletedAt, createdAt: x.createdAt, editedAt: x.editedAt ?? null, hidden: false, author: demoPersonRef(x.author), reactions: demoReactions(x.parentId ? 'resposta' : 'post', x.id) })),
    };
  },
  check(d: JogatinaDraft) {
    if (d.title.trim().length < 3 || d.title.trim().length > 80) err('name_invalid');
    if (!d.gameId) err('game_needed');
    if (!d.startsAt) err('date_needed');
    if (d.maxPeople != null && (d.maxPeople < 2 || d.maxPeople > 64)) err('max_invalid');
  },
  create(d: JogatinaDraft): Jogatina {
    demo.check(d);
    if (Date.parse(d.startsAt!) < Date.now() - 3_600_000) err('date_past');
    if (d.clubId && !demoClubRef(d.clubId)?.member) err('not_member');
    const db = loadDb();
    const j: DJog = {
      id: `j-${Date.now().toString(36)}`, title: d.title.trim(), description: d.description.trim().slice(0, 500), gameId: d.gameId!, startsAt: d.startsAt!, durationMin: d.durationMin,
      platform: d.platform?.trim().slice(0, 40) || null, maxPeople: d.maxPeople, access: d.access, liveUrl: d.liveUrl, community: null, clubId: d.clubId,
      createdAt: new Date().toISOString(), hidden: false, ownerId: ME, extra: 0, people: [{ id: ME, rsvp: 'vou', wasThere: false, joinedAt: new Date().toISOString() }],
    };
    db.jogs.push(j); saveDb(db); return out(j);
  },
  update(id: string, d: JogatinaDraft): Jogatina {
    const db = loadDb(); const j = db.jogs.find((x) => x.id === id);
    if (!j) err('target_not_found');
    if (j.ownerId !== ME) err('not_owner');
    demo.check({ ...d, gameId: j.gameId });
    Object.assign(j, { title: d.title.trim(), description: d.description.trim().slice(0, 500), startsAt: d.startsAt, durationMin: d.durationMin, platform: d.platform?.trim().slice(0, 40) || null, maxPeople: d.maxPeople, access: d.access, liveUrl: d.liveUrl });
    saveDb(db); return out(j);
  },
  cancel(id: string, on: boolean): Jogatina {
    const db = loadDb(); const j = db.jogs.find((x) => x.id === id);
    if (!j) err('target_not_found');
    if (j.ownerId !== ME) err('not_owner');
    j.canceledAt = on ? new Date().toISOString() : null; saveDb(db); return out(j);
  },
  rsvp(id: string, r: Rsvp | null): Jogatina {
    const db = loadDb(); const j = db.jogs.find((x) => x.id === id);
    if (!j) err('target_not_found');
    if (j.canceledAt) err('jogatina_canceled');
    const o = out(j);
    const me = j.people.find((p) => p.id === ME);
    if (o.ended && !me) err('club_ended');
    if (r == null) { if (j.ownerId === ME) err('owner_leave'); j.people = j.people.filter((p) => p.id !== ME); saveDb(db); return out(j); }
    if (r === 'vou' && me?.rsvp !== 'vou' && j.maxPeople && o.going >= j.maxPeople) err('club_full');
    if (me) me.rsvp = r; else j.people.push({ id: ME, rsvp: r, wasThere: false, joinedAt: new Date().toISOString() });
    saveDb(db); return out(j);
  },
  invite(id: string, handles: string[]): InviteResult {
    const db = loadDb(); const j = db.jogs.find((x) => x.id === id);
    if (!j) err('target_not_found');
    if (j.ownerId !== ME && !j.people.some((p) => p.id === ME && p.rsvp !== 'nao')) err('invite_not_allowed');
    if (handles.length > 20) err('invite_too_many');
    const r: InviteResult = { sent: [], already: [], notFound: [] };
    for (const h of handles) {
      const who = DEMO_PEOPLE.find((p) => p.handle.toLowerCase() === h)?.id ?? (h === 'lu' ? 'demo-lu' : null);
      if (!who) { r.notFound.push(h); continue; }
      if (j.people.some((p) => p.id === who)) { r.already.push(h); continue; }
      if (!db.invites.some((i) => i.jog === id && i.user === who)) db.invites.push({ jog: id, user: who, by: ME, at: new Date().toISOString() });
      r.sent.push(h);
    }
    saveDb(db); return r;
  },
  wasThere(id: string, on: boolean): Jogatina {
    const db = loadDb(); const j = db.jogs.find((x) => x.id === id);
    const me = j?.people.find((p) => p.id === ME);
    if (!j || !me) err('not_member');
    if (Date.parse(j!.startsAt) > Date.now()) err('jogatina_not_started');
    me!.wasThere = on; if (on) me!.rsvp = 'vou'; saveDb(db); return out(j!);
  },
  message(id: string, parentId: string | null, body: string, question: boolean, images: string[]): GroupMessage {
    const db = loadDb(); const j = db.jogs.find((x) => x.id === id);
    if (!j || !j.people.some((p) => p.id === ME)) err('not_member');
    const t = body.trim();
    if (!t || t.length > 5000) err('body_invalid');
    let parent: string | null = null;
    if (parentId) { const x = db.msgs.find((k) => k.id === parentId); if (x) parent = x.parentId ?? x.id; }
    const m: DMsg = { id: rid(), jog: id, parentId: parent, author: ME, question: question && !parent, body: t, images: images.slice(0, 4), createdAt: new Date().toISOString() };
    db.msgs.push(m); saveDb(db);
    return { id: m.id, part: 0, parentId: m.parentId, question: m.question, target: m.parentId ? 'resposta' : 'post', body: m.body, images: m.images, deleted: false, createdAt: m.createdAt, editedAt: null, hidden: false, author: demoPersonRef(ME), reactions: { mine: [] } };
  },
  editMessage(id: string, body: string) {
    const db = loadDb(); const m = db.msgs.find((x) => x.id === id && x.author === ME);
    if (!m) err('not_author');
    if (!body.trim()) err('body_invalid');
    m!.body = body.trim(); m!.editedAt = new Date().toISOString(); saveDb(db);
  },
  deleteMessage(id: string) {
    const db = loadDb(); const m = db.msgs.find((x) => x.id === id && x.author === ME);
    if (!m) err('not_author');
    m!.deletedAt = new Date().toISOString(); m!.images = []; saveDb(db);
  },
};

/** Avisos das jogatinas na demonstração: a que começa logo, respostas e menções. */
export async function demoJogatinaNews(seenAt: string): Promise<ReplyNews> {
  const db = loadDb(); const now = Date.now();
  const items: NewsItem[] = [];
  const myHandle = (demoPersonRef(ME).handle ?? '').toLowerCase();
  for (const j of db.jogs) {
    const me = j.people.find((p) => p.id === ME);
    if (j.hidden) continue;
    const s = Date.parse(j.startsAt);
    if (!me) {
      const inv = db.invites.find((i) => i.jog === j.id && i.user === ME);
      if (inv && !j.canceledAt && jogatinaEnd(j) > now) items.push({ kind: 'jogatina_convite', id: `c:${j.id}`, ref: '', slug: j.id, title: j.title, at: inv.at, author: demoPersonRef(inv.by) });
      continue;
    }
    if (me.rsvp !== 'nao' && !j.canceledAt && s - 12 * 3_600_000 <= now && jogatinaEnd(j) > now) items.push({ kind: 'jogatina', id: j.id, ref: '', slug: j.id, title: j.title, at: new Date(s - 12 * 3_600_000).toISOString() });
    for (const x of db.msgs.filter((k) => k.jog === j.id && k.author !== ME && !k.deletedAt && Date.parse(k.createdAt) > now - 30 * 86_400_000)) {
      const parent = x.parentId ? db.msgs.find((k) => k.id === x.parentId) : null;
      if (parent?.author === ME) items.push({ kind: 'jogatina_resposta', id: x.id, ref: parent.id, slug: j.id, title: j.title, excerpt: x.body.slice(0, 140), at: x.createdAt, author: demoPersonRef(x.author) });
      else if (mentionsOf(x.body).some((h) => h.toLowerCase() === myHandle)) items.push({ kind: 'jogatina_mencao', id: x.id, ref: '', slug: j.id, title: j.title, excerpt: x.body.slice(0, 140), at: x.createdAt, author: demoPersonRef(x.author) });
    }
  }
  const o = items.map((i) => ({ ...i, new: i.at > seenAt }));
  return { count: o.filter((i) => i.new).length, items: o };
}

/** "Baixar tudo" na demonstração: as suas jogatinas e o que você escreveu nelas. */
export async function demoJogatinaData(): Promise<Record<string, unknown>> {
  const db = loadDb();
  return {
    jogatinas: db.jogs.filter((j) => j.people.some((p) => p.id === ME)).map((j) => { const p = j.people.find((x) => x.id === ME)!; return { endereco: `jogatina/${j.id}`, titulo: j.title, jogo: demoGameMini(j.gameId)?.title ?? null, quando: j.startsAt, resposta: p.rsvp, euEstavaLa: p.wasThere, entrouEm: p.joinedAt, criada: j.ownerId === ME }; }),
    mensagensNasJogatinas: db.msgs.filter((x) => x.author === ME).map((x) => ({ id: x.id, onde: `jogatina/${x.jog}`, resposta: !!x.parentId, texto: x.body, imagens: x.images, criadaEm: x.createdAt, editadaEm: x.editedAt ?? null, apagadaEm: x.deletedAt ?? null })),
  };
}
