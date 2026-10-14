/**
 * Clubes (Etapa 6, entrega 5): soltos, sempre sobre um jogo, em três formatos.
 *   encontro      → Encontro de uma noite (dia e hora, Vou/Talvez/Não vou, mural depois)
 *   sem_pressa    → Clube sem pressa (partes; a conversa de cada parte só abre para quem passou dela)
 *   primeira_vez  → Primeira vez juntos (quem nunca jogou e os guias)
 * Com conta, tudo passa pelas funções do banco (migração 0028). Na demonstração, fica neste navegador.
 */
import { getState } from './store';
import { communityApi, demoGameMini, demoPersonRef, demoReactions, slugOk, type GameMini, type NewsItem, type PersonRef, type Reactions, type ReplyNews } from './communityApi';

export type ClubFormat = 'encontro' | 'sem_pressa' | 'primeira_vez';
export type ClubAccess = 'aberto' | 'amigos' | 'convite';
export type Rsvp = 'vou' | 'talvez' | 'nao';
export interface ClubPart { ordinal: number; title: string; suggestedOn?: string | null }
export interface ClubMe { role: 'dono' | 'membro'; rsvp?: Rsvp | null; firstTime?: boolean | null; stage: number; finishedAt?: string | null }
export interface Club {
  id: string; slug: string; name: string; description: string; format: ClubFormat; game: GameMini | null; access: ClubAccess;
  maxMembers?: number | null; community?: { slug: string; name: string } | null; startsAt?: string | null; durationMin: number;
  liveUrl?: string | null; ended: boolean; createdAt: string; hidden: boolean; owner?: PersonRef | null; members: number; going: number;
  me?: ClubMe | null; inviteCode?: string | null; parts: ClubPart[]; lastAt?: string | null;
}
export interface ClubPerson extends PersonRef {
  role: 'dono' | 'membro'; rsvp?: Rsvp | null; firstTime?: boolean | null; stage: number; finishedAt?: string | null; joinedAt: string;
  journey?: { progress: number | null; completed: boolean | null } | null;
}
export interface ClubMessage {
  id: string; part: number; parentId: string | null; question: boolean; body: string; images: string[]; deleted: boolean;
  createdAt: string; editedAt?: string | null; hidden: boolean; author: PersonRef; reactions: Reactions;
}
export interface ClubFull extends Club { locked: false; people: ClubPerson[]; messages: ClubMessage[]; hiddenParts: Record<string, number> }
export interface ClubLocked { locked: true; slug: string; name: string; access: ClubAccess; format: ClubFormat; game: GameMini | null; owner?: PersonRef | null }
export interface ClubDraft {
  slug: string; name: string; description: string; format: ClubFormat; gameId: string | null; access: ClubAccess; maxMembers: number | null;
  communityId: string | null; startsAt: string | null; durationMin: number; liveUrl: string | null; parts: ClubPart[]; firstTime?: boolean; newCode?: boolean;
}

export const FORMATS: { k: ClubFormat; label: string; short: string; hint: string }[] = [
  { k: 'encontro', label: 'Encontro de uma noite', short: 'Encontro', hint: 'Uma jogatina com dia e hora. Quem vai confirma, e depois fica o mural do que rolou.' },
  { k: 'sem_pressa', label: 'Clube sem pressa', short: 'Sem pressa', hint: 'Como um clube do livro: o jogo dividido em partes, cada um no seu ritmo, sem spoiler de quem está na frente.' },
  { k: 'primeira_vez', label: 'Primeira vez juntos', short: 'Primeira vez', hint: 'Quem nunca jogou acompanhado por quem já zerou, os guias, que respondem sem entregar nada.' },
];
export const FORMAT_LABEL = Object.fromEntries(FORMATS.map((f) => [f.k, f.label])) as Record<ClubFormat, string>;
export const FORMAT_SHORT = Object.fromEntries(FORMATS.map((f) => [f.k, f.short])) as Record<ClubFormat, string>;
export const ACCESS: { k: ClubAccess; label: string; hint: string }[] = [
  { k: 'aberto', label: 'Aberto', hint: 'Aparece na lista; qualquer pessoa entra.' },
  { k: 'amigos', label: 'Só amigos', hint: 'Só os seus amigos veem e entram.' },
  { k: 'convite', label: 'Por convite', hint: 'Não aparece na lista; entra quem tem o link.' },
];
export const RSVP_LABEL: Record<Rsvp, string> = { vou: 'Vou', talvez: 'Talvez', nao: 'Não vou' };

const MSG: Record<string, string> = {
  not_logged: 'Entre na sua conta para participar.',
  handle_needed: 'Escolha o seu @ antes de participar.',
  rules_needed: 'Aceite as regras da comunidade para participar.',
  suspended: 'O seu perfil está suspenso pela moderação; por enquanto não dá para participar.',
  slug_invalid: 'O endereço precisa ter de 3 a 32 letras, números ou hífens.',
  slug_offensive: 'Esse endereço tem uma palavra que não pode.',
  slug_reserved: 'Esse endereço é reservado. Escolha outro.',
  slug_taken: 'Já existe um clube com esse endereço.',
  name_invalid: 'O nome precisa ter de 3 a 60 caracteres.',
  text_offensive: 'O texto tem uma palavra que não pode.',
  text_long: 'A descrição passou de 500 caracteres.',
  live_invalid: 'O link da live precisa ser um endereço completo, começando com https://',
  game_needed: 'Escolha o jogo do clube.',
  date_needed: 'Escolha o dia e a hora do encontro.',
  date_past: 'Essa data já passou.',
  club_limit: 'Você já criou 5 clubes hoje. Volte amanhã.',
  club_closed: 'Esse clube é só para amigos de quem criou ou por convite.',
  club_full: 'As vagas desse clube acabaram.',
  club_ended: 'Esse encontro já aconteceu.',
  owner_leave: 'Quem criou o clube não pode sair dele.',
  not_member: 'Entre no clube para participar da conversa.',
  not_owner: 'Só quem criou o clube pode fazer isso.',
  not_author: 'Só quem escreveu pode fazer isso.',
  part_locked: 'Marque que passou dessa parte para conversar nela.',
  body_invalid: 'Escreva alguma coisa (até 5 mil caracteres).',
  reply_limit: 'Muitas mensagens em pouco tempo. Espere um pouco.',
  public_limit: 'Conta nova tem um limite de publicações por hora. Espere um pouco.',
  image_limit: 'No máximo 4 imagens por mensagem.',
  target_not_found: 'Não achei. Talvez tenha sido apagado.',
};
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/club_|my_news|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0028 no Supabase.');
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => ok(await (await client()).rpc(fn, args)) as T;
const draftJson = (d: ClubDraft) => ({
  slug: d.slug, name: d.name, description: d.description, format: d.format, gameId: d.gameId, access: d.access,
  maxMembers: d.maxMembers ?? '', communityId: d.communityId, startsAt: d.startsAt, durationMin: d.durationMin, liveUrl: d.liveUrl ?? '',
  parts: d.parts.map((p) => ({ title: p.title, suggestedOn: p.suggestedOn ?? '' })), firstTime: d.firstTime ?? false, newCode: d.newCode ?? false,
});

export const clubApi = {
  async list(filter: 'todos' | 'meus' | 'proximos' = 'todos', game?: string): Promise<Club[]> {
    if (!supa()) return demo.list(filter, game);
    if (filter === 'meus' && !getState().profile) return [];
    return (await rpc<Club[] | null>('club_list', { p_filter: filter, p_game: game ?? null, p_limit: 60 })) ?? [];
  },
  async get(slug: string, code?: string | null): Promise<ClubFull | ClubLocked | null> {
    if (!supa()) return demo.get(slug);
    return rpc<ClubFull | ClubLocked | null>('club_get', { p_slug: slug, p_code: code ?? null });
  },
  async create(d: ClubDraft): Promise<Club> {
    if (!supa()) return demo.create(d);
    return rpc<Club>('club_create', { p: draftJson(d) });
  },
  async update(id: string, d: ClubDraft): Promise<Club> {
    if (!supa()) return demo.update(id, d);
    return rpc<Club>('club_update', { p_id: id, p: draftJson(d) });
  },
  async join(slug: string, code: string | null, firstTime: boolean | null): Promise<Club> {
    if (!supa()) return demo.join(slug, firstTime);
    return rpc<Club>('club_join', { p_slug: slug, p_code: code, p_first_time: firstTime });
  },
  async leave(id: string): Promise<void> {
    if (!supa()) return demo.leave(id);
    await rpc('club_leave', { p_id: id });
  },
  async me(id: string, patch: { rsvp?: Rsvp; stage?: number; firstTime?: boolean; finished?: boolean }): Promise<Club> {
    if (!supa()) return demo.me(id, patch);
    return rpc<Club>('club_me', { p_id: id, p: patch });
  },
  async message(clubId: string, part: number, parentId: string | null, body: string, question: boolean, images: string[]): Promise<ClubMessage> {
    if (!supa()) return demo.message(clubId, part, parentId, body, question, images);
    return rpc<ClubMessage>('club_message', { p_club: clubId, p_part: part, p_parent: parentId, p_body: body, p_question: question, p_images: images });
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
/* Agenda: arquivo .ics do encontro                                     */
/* ------------------------------------------------------------------ */
export function icsFor(c: Pick<Club, 'slug' | 'name' | 'description' | 'startsAt' | 'durationMin' | 'liveUrl' | 'game'>, origin: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const start = new Date(c.startsAt ?? Date.now());
  const end = new Date(start.getTime() + c.durationMin * 60_000);
  const url = `${origin}/clube/${c.slug}`;
  const desc = [c.game ? `Jogo: ${c.game.title}` : '', c.description, c.liveUrl ? `Live: ${c.liveUrl}` : '', `No WinnerZ: ${url}`].filter(Boolean).join('\n');
  const fold = (line: string) => line.match(/.{1,73}/g)!.join('\r\n ');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WinnerZ//Clubes//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:clube-${c.slug}@winnerz.com.br`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    fold(`SUMMARY:${esc(c.name)}`), fold(`DESCRIPTION:${esc(desc)}`), fold(`URL:${url}`), c.liveUrl ? fold(`LOCATION:${esc(c.liveUrl)}`) : '',
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(c.name)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}

/** Agora (com 15 minutos de antecedência) até o fim previsto. */
export function encontroNow(c: Pick<Club, 'format' | 'startsAt' | 'durationMin'>, now = Date.now()): boolean {
  if (c.format !== 'encontro' || !c.startsAt) return false;
  const s = Date.parse(c.startsAt);
  return now >= s - 15 * 60_000 && now <= s + c.durationMin * 60_000;
}

/* ------------------------------------------------------------------ */
/* Demonstração                                                         */
/* ------------------------------------------------------------------ */
type DMember = { id: string; role: 'dono' | 'membro'; rsvp?: Rsvp | null; firstTime?: boolean | null; stage: number; finishedAt?: string | null; joinedAt: string };
type DClub = Omit<Club, 'game' | 'owner' | 'members' | 'going' | 'me' | 'ended' | 'lastAt' | 'inviteCode'> & { gameId: string; ownerId: string; people: DMember[]; extra: number };
type DMsg = { id: string; club: string; part: number; parentId: string | null; author: string; question: boolean; body: string; images: string[]; createdAt: string; editedAt?: string | null; deletedAt?: string | null };
type DB = { v: number; clubs: DClub[]; msgs: DMsg[] };
const KEY = 'wz.demo.clubes';
const VERSION = 1;
const ME = 'demo-me';
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const dayOffset = (d: number) => { const x = new Date(Date.now() + d * 86_400_000); return x.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); };
const rid = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
/** Hoje às 21h (horário de Brasília), ou amanhã se já passou das 23h. */
function tonight(): string {
  const day = dayOffset(0);
  const t = Date.parse(`${day}T21:00:00-03:00`);
  return new Date(t + 2 * 3_600_000 < Date.now() ? t + 86_400_000 : t).toISOString();
}

function seed(): DB {
  const m = (id: string, role: 'dono' | 'membro', more: Partial<DMember> = {}): DMember => ({ id, role, stage: 0, joinedAt: hoursAgo(24 * 5), ...more });
  const base = { maxMembers: null, community: null, durationMin: 120, liveUrl: null, hidden: false, access: 'aberto' as ClubAccess, parts: [] as ClubPart[], startsAt: null };
  const clubs: DClub[] = [
    { ...base, id: 'k-noite', slug: 'noite-de-astro-bot', name: 'Noite de Astro Bot', description: 'Live fechando o último planeta. Quem quiser joga junto e comenta aqui.', format: 'encontro', gameId: 'astro',
      startsAt: tonight(), liveUrl: 'https://www.twitch.tv/winnerz', createdAt: hoursAgo(30), ownerId: ME, extra: 9,
      people: [m(ME, 'dono', { rsvp: 'vou' }), m('demo-duda', 'membro', { rsvp: 'vou' }), m('demo-rafa', 'membro', { rsvp: 'talvez' })] },
    { ...base, id: 'k-derby', slug: 'derby-de-sexta', name: 'Derby de sexta', description: 'Uma noite de Destruction Derby no emulador, quem bater menos paga o próximo.', format: 'encontro', gameId: 'dderby',
      startsAt: new Date(Date.now() - 6 * 86_400_000).toISOString(), durationMin: 180, createdAt: hoursAgo(24 * 9), ownerId: 'demo-rafa', extra: 3,
      people: [m('demo-rafa', 'dono', { rsvp: 'vou' }), m(ME, 'membro', { rsvp: 'vou' }), m('demo-carol', 'membro', { rsvp: 'nao' })] },
    { ...base, id: 'k-elden', slug: 'elden-sem-pressa', name: 'Elden Ring sem pressa', description: 'Um mês e meio para atravessar as Terras Intermédias, cada um no seu ritmo.', format: 'sem_pressa', gameId: 'elden',
      createdAt: hoursAgo(24 * 20), ownerId: 'demo-carol', extra: 14,
      parts: [{ ordinal: 1, title: 'Até a Margit', suggestedOn: dayOffset(-14) }, { ordinal: 2, title: 'Liurnia e a Academia', suggestedOn: dayOffset(-7) },
        { ordinal: 3, title: 'A capital', suggestedOn: dayOffset(0) }, { ordinal: 4, title: 'Até o final', suggestedOn: dayOffset(14) }],
      people: [m('demo-carol', 'dono', { stage: 3 }), m('demo-duda', 'membro', { stage: 4 }), m(ME, 'membro', { stage: 1 })] },
    { ...base, id: 'k-tlou', slug: 'primeira-vez-tlou-2', name: 'Primeira vez em The Last of Us Part II', description: 'Para quem nunca jogou. Guias respondem sem entregar a história.', format: 'primeira_vez', gameId: 'tlou2',
      createdAt: hoursAgo(24 * 12), ownerId: 'demo-duda', extra: 6,
      people: [m('demo-duda', 'dono', { firstTime: false }), m('demo-carol', 'membro', { firstTime: false }), m(ME, 'membro', { firstTime: true }),
        m('demo-rafa', 'membro', { firstTime: true, finishedAt: hoursAgo(26) })] },
  ];
  const x = (id: string, club: string, author: string, h: number, body: string, more: Partial<DMsg> = {}): DMsg => ({ id, club, part: 0, parentId: null, author, question: false, body, images: [], createdAt: hoursAgo(h), ...more });
  const msgs: DMsg[] = [
    x('n1', 'k-noite', 'demo-duda', 20, 'Vou estar lá! Ainda me falta o planeta de gelo.'),
    x('n2', 'k-noite', 'demo-rafa', 18, 'Se der tempo eu entro. Alguém sabe se tem segredo no último chefe?'),
    x('n3', 'k-noite', ME, 17, 'Tem sim, mas fica para a live 😄', { parentId: 'n2' }),
    x('d1', 'k-derby', 'demo-rafa', 24 * 6 - 3, 'Que noite! Bati o recorde de carros destruídos no estádio.', { images: ['/demo/scene-dderby.webp'] }),
    x('d2', 'k-derby', ME, 24 * 6 - 4, 'Valeu pela noite, rafa. Na próxima eu levo o volante.'),
    x('e1', 'k-elden', 'demo-carol', 24 * 19, 'Boas-vindas! Combinado: spoiler só dentro da conversa de cada parte.'),
    x('e2', 'k-elden', 'demo-carol', 24 * 12, 'Margit caiu na 6ª tentativa. Usei a cinza do lobo.', { part: 1 }),
    x('e3', 'k-elden', 'demo-duda', 24 * 11, 'Eu fui com o escudo grande. Lento, mas seguro.', { part: 1, parentId: 'e2' }),
    x('e4', 'k-elden', 'demo-duda', 24 * 6, 'A Academia de Raya Lucaria é o lugar mais bonito do jogo.', { part: 2 }),
    x('e5', 'k-elden', 'demo-carol', 30, 'Cheguei na capital. Que escala!', { part: 3 }),
    x('e6', 'k-elden', 'demo-duda', 24 * 2, 'Zerei. O final da Ranni vale cada passo.', { part: 4 }),
    x('t1', 'k-tlou', ME, 24 * 3, 'Vale explorar tudo ou seguir a história? Não quero perder nada importante.', { question: true }),
    x('t2', 'k-tlou', 'demo-duda', 24 * 3 - 2, 'Explore! Os lugares contam muita coisa em bilhetes e detalhes. Não tem nada que você perca para sempre por não correr.', { parentId: 't1' }),
    x('t3', 'k-tlou', 'demo-carol', 24 * 3 - 1, 'Só um aviso: ||tem um momento no meio em que você muda de ponto de vista||. Vá sem medo.', { parentId: 't1' }),
    x('t4', 'k-tlou', 'demo-rafa', 26, 'Zerei pela primeira vez. Não estava pronto para aquele final.'),
  ];
  return { v: VERSION, clubs, msgs };
}
function loadDb(): DB {
  try { const x = JSON.parse(localStorage.getItem(KEY) || 'null') as DB | null; if (x && x.v === VERSION) return x; } catch { /* começa de novo */ }
  const s = seed(); saveDb(s); return s;
}
function saveDb(db: DB) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { throw new Error('O navegador ficou sem espaço para a demonstração. Use imagens menores ou recomece a demonstração.'); } }
function err(code: string): never { throw new Error(MSG[code] ?? code); }

function clubOut(c: DClub): Club {
  const me = c.people.find((p) => p.id === ME);
  const ended = c.format === 'encontro' && !!c.startsAt && Date.parse(c.startsAt) + c.durationMin * 60_000 < Date.now();
  const db = loadDb();
  return {
    id: c.id, slug: c.slug, name: c.name, description: c.description, format: c.format, game: demoGameMini(c.gameId), access: c.access,
    maxMembers: c.maxMembers, community: c.community, startsAt: c.startsAt, durationMin: c.durationMin, liveUrl: c.liveUrl, ended,
    createdAt: c.createdAt, hidden: c.hidden, owner: demoPersonRef(c.ownerId), members: c.people.length + c.extra,
    going: c.people.filter((p) => p.rsvp === 'vou').length + (c.format === 'encontro' ? Math.floor(c.extra / 2) : 0),
    me: me ? { role: me.role, rsvp: me.rsvp, firstTime: me.firstTime, stage: me.stage, finishedAt: me.finishedAt } : null,
    inviteCode: c.ownerId === ME ? 'demo' : null, parts: c.parts,
    lastAt: db.msgs.filter((x) => x.club === c.id && !x.deletedAt).map((x) => x.createdAt).sort().pop() ?? null,
  };
}

const demo = {
  list(filter: 'todos' | 'meus' | 'proximos', game?: string): Club[] {
    const db = loadDb();
    let l = db.clubs.filter((c) => !c.hidden);
    if (game) l = l.filter((c) => c.gameId === game || demoGameMini(c.gameId)?.slug === game);
    const out = l.map(clubOut);
    const key = (c: Club) => (c.format === 'encontro' && !c.ended && c.startsAt ? Date.parse(c.startsAt) : 9e15);
    const r = filter === 'meus' ? out.filter((c) => c.me)
      : filter === 'proximos' ? out.filter((c) => c.format === 'encontro' && !c.ended && c.startsAt && Date.parse(c.startsAt) < Date.now() + 7 * 86_400_000)
      : out.filter((c) => !c.ended);
    return r.sort((a, b) => key(a) - key(b) || b.createdAt.localeCompare(a.createdAt));
  },
  get(slug: string): ClubFull | null {
    const db = loadDb(); const c = db.clubs.find((x) => x.slug === slug.toLowerCase());
    if (!c) return null;
    const me = c.people.find((p) => p.id === ME);
    const stage = me?.stage ?? 0;
    const msgs = db.msgs.filter((x) => x.club === c.id && (x.part === 0 || (me && x.part <= stage)) && (!x.deletedAt || db.msgs.some((k) => k.parentId === x.id && !k.deletedAt)));
    const hidden: Record<string, number> = {};
    db.msgs.filter((x) => x.club === c.id && x.part > (me ? stage : 0) && !x.deletedAt).forEach((x) => { hidden[x.part] = (hidden[x.part] ?? 0) + 1; });
    const reacts = (id: string): Reactions => demoReactions('mensagem', id);
    return {
      ...clubOut(c), locked: false,
      people: c.people.map((p) => ({ ...demoPersonRef(p.id), role: p.role, rsvp: p.rsvp, firstTime: p.firstTime, stage: p.stage, finishedAt: p.finishedAt, joinedAt: p.joinedAt, journey: null })),
      messages: msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((x) => ({ id: x.id, part: x.part, parentId: x.parentId, question: x.question, body: x.deletedAt ? '' : x.body, images: x.deletedAt ? [] : x.images, deleted: !!x.deletedAt, createdAt: x.createdAt, editedAt: x.editedAt ?? null, hidden: false, author: demoPersonRef(x.author), reactions: reacts(x.id) })),
      hiddenParts: hidden,
    };
  },
  create(d: ClubDraft): Club {
    const db = loadDb();
    if (!slugOk(d.slug)) err('slug_invalid');
    if (db.clubs.some((c) => c.slug === d.slug)) err('slug_taken');
    if (d.name.trim().length < 3 || d.name.trim().length > 60) err('name_invalid');
    if (!d.gameId) err('game_needed');
    if (d.format === 'encontro' && !d.startsAt) err('date_needed');
    const c: DClub = {
      id: `k-${d.slug}`, slug: d.slug, name: d.name.trim(), description: d.description.trim().slice(0, 500), format: d.format, gameId: d.gameId!, access: d.access,
      maxMembers: d.maxMembers, community: null, startsAt: d.format === 'encontro' ? d.startsAt : null, durationMin: d.durationMin, liveUrl: d.liveUrl,
      createdAt: new Date().toISOString(), hidden: false, ownerId: ME, extra: 0,
      parts: d.format === 'sem_pressa' ? d.parts.filter((p) => p.title.trim()).slice(0, 30).map((p, i) => ({ ordinal: i + 1, title: p.title.trim().slice(0, 80), suggestedOn: p.suggestedOn || null })) : [],
      people: [{ id: ME, role: 'dono', rsvp: d.format === 'encontro' ? 'vou' : null, firstTime: d.format === 'primeira_vez' ? !!d.firstTime : null, stage: 0, joinedAt: new Date().toISOString() }],
    };
    db.clubs.push(c); saveDb(db); return clubOut(c);
  },
  update(id: string, d: ClubDraft): Club {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    if (!c) err('target_not_found');
    if (c.ownerId !== ME) err('not_owner');
    if (d.name.trim().length < 3 || d.name.trim().length > 60) err('name_invalid');
    Object.assign(c, { name: d.name.trim(), description: d.description.trim().slice(0, 500), access: d.access, maxMembers: d.maxMembers, startsAt: c.format === 'encontro' ? d.startsAt ?? c.startsAt : null, durationMin: d.durationMin, liveUrl: d.liveUrl });
    if (c.format === 'sem_pressa') c.parts = d.parts.filter((p) => p.title.trim()).slice(0, 30).map((p, i) => ({ ordinal: i + 1, title: p.title.trim().slice(0, 80), suggestedOn: p.suggestedOn || null }));
    saveDb(db); return clubOut(c);
  },
  join(slug: string, firstTime: boolean | null): Club {
    const db = loadDb(); const c = db.clubs.find((x) => x.slug === slug);
    if (!c) err('target_not_found');
    if (!c.people.some((p) => p.id === ME)) {
      if (c.maxMembers && c.people.length + c.extra >= c.maxMembers) err('club_full');
      c.people.push({ id: ME, role: 'membro', rsvp: c.format === 'encontro' ? 'vou' : null, firstTime: c.format === 'primeira_vez' ? firstTime ?? true : null, stage: 0, joinedAt: new Date().toISOString() });
      saveDb(db);
    }
    return clubOut(c);
  },
  leave(id: string) {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    if (!c) return;
    if (c.ownerId === ME) err('owner_leave');
    c.people = c.people.filter((p) => p.id !== ME); saveDb(db);
  },
  me(id: string, patch: { rsvp?: Rsvp; stage?: number; firstTime?: boolean; finished?: boolean }): Club {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    const p = c?.people.find((x) => x.id === ME);
    if (!c || !p) err('not_member');
    if (patch.rsvp && c!.format === 'encontro') p!.rsvp = patch.rsvp;
    if (patch.stage != null) p!.stage = Math.max(0, Math.min(c!.parts.length, patch.stage));
    if (patch.firstTime != null && c!.format === 'primeira_vez') p!.firstTime = patch.firstTime;
    if (patch.finished != null) p!.finishedAt = patch.finished ? p!.finishedAt ?? new Date().toISOString() : null;
    saveDb(db); return clubOut(c!);
  },
  message(clubId: string, part: number, parentId: string | null, body: string, question: boolean, images: string[]): ClubMessage {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === clubId);
    const me = c?.people.find((p) => p.id === ME);
    if (!c || !me) err('not_member');
    const t = body.trim();
    if (!t || t.length > 5000) err('body_invalid');
    let p = part; let parent: string | null = null;
    if (parentId) { const x = db.msgs.find((k) => k.id === parentId); if (x) { parent = x.parentId ?? x.id; p = x.part; } }
    if (p > 0 && p > me!.stage) err('part_locked');
    const m: DMsg = { id: rid(), club: clubId, part: p, parentId: parent, author: ME, question: question && !parent, body: t, images: images.slice(0, 4), createdAt: new Date().toISOString() };
    db.msgs.push(m); saveDb(db);
    return { id: m.id, part: m.part, parentId: m.parentId, question: m.question, body: m.body, images: m.images, deleted: false, createdAt: m.createdAt, editedAt: null, hidden: false, author: demoPersonRef(ME), reactions: { gg: 0, coracao: 0, mine: [] } };
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

/** Avisos dos clubes na demonstração: respostas às suas mensagens, encontro chegando, parte que abriu. */
export async function demoClubNews(seenAt: string): Promise<ReplyNews> {
  const db = loadDb(); const now = Date.now();
  const items: NewsItem[] = [];
  for (const c of db.clubs) {
    const me = c.people.find((p) => p.id === ME);
    if (!me) continue;
    for (const x of db.msgs.filter((k) => k.club === c.id && k.parentId && k.author !== ME && !k.deletedAt)) {
      const parent = db.msgs.find((k) => k.id === x.parentId);
      if (parent?.author === ME && Date.parse(x.createdAt) > now - 30 * 86_400_000) items.push({ kind: 'clube_resposta', id: x.id, ref: String(x.part), slug: c.slug, title: c.name, excerpt: x.body.slice(0, 140), at: x.createdAt, author: demoPersonRef(x.author) });
    }
    if (c.format === 'encontro' && c.startsAt && me.rsvp !== 'nao') {
      const at = Date.parse(c.startsAt) - 12 * 3_600_000;
      if (at <= now && Date.parse(c.startsAt) + c.durationMin * 60_000 > now) items.push({ kind: 'encontro', id: c.id, ref: '', slug: c.slug, title: c.name, at: new Date(at).toISOString() });
    }
    for (const p of c.parts) {
      if (!p.suggestedOn || me.stage >= p.ordinal) continue;
      const at = Date.parse(`${p.suggestedOn}T00:00:00-03:00`);
      if (at <= now && at > now - 3 * 86_400_000) items.push({ kind: 'parte', id: `${c.id}:${p.ordinal}`, ref: String(p.ordinal), slug: c.slug, title: c.name, excerpt: p.title, at: new Date(at).toISOString() });
    }
  }
  const out = items.map((i) => ({ ...i, new: i.at > seenAt }));
  return { count: out.filter((i) => i.new).length, items: out.sort((a, b) => b.at.localeCompare(a.at)) };
}
