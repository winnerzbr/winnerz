/**
 * Clubes (Etapa 6, entrega C): grupos que continuam, sempre com um jogo atual (que pode mudar) e um ritmo:
 *   sem_pressa    → Sem pressa (partes; a conversa de cada parte só abre para quem passou dela)
 *   primeira_vez  → Primeira vez juntos (quem nunca jogou e os guias)
 *   recorrente    → Encontro recorrente (um combinado, ex.: "sábados, 21h", e a agenda de jogatinas)
 *   mes           → Clube do mês (um jogo por mês; acabou, troca o jogo e as memórias ficam)
 * Uma noite marcada é uma jogatina (jogatinaApi), solta ou na agenda de um clube.
 * Com conta, tudo passa pelas funções do banco (migrações 0028, 0029 e 0031). Na demonstração, fica neste navegador.
 */
import { getState } from './store';
import { communityApi, demoGameMini, demoPersonRef, demoReactions, fixAuthors, slugOk, type GameMini, type NewsItem, type PersonRef, type Reactions, type ReplyNews } from './communityApi';
import { demoClubAgenda, demoClubPast, type Jogatina } from './jogatinaApi';
import { mentionsOf } from '../lib/postText';
import { DEMO_PEOPLE } from './demoPeople';

export type ClubFormat = 'sem_pressa' | 'primeira_vez' | 'recorrente' | 'mes';
export type ClubAccess = 'aberto' | 'amigos' | 'convite';
export interface ClubPart { ordinal: number; title: string; suggestedOn?: string | null }
export interface ClubMe { role: 'dono' | 'membro'; firstTime?: boolean | null; stage: number; finishedAt?: string | null }
export interface Club {
  id: string; slug: string; name: string; description: string; format: ClubFormat; game: GameMini | null; access: ClubAccess;
  maxMembers?: number | null; community?: { slug: string; name: string } | null; schedule?: string | null; round: number;
  liveUrl?: string | null; createdAt: string; hidden: boolean; owner?: PersonRef | null; members: number;
  me?: ClubMe | null; inviteCode?: string | null; parts: ClubPart[]; next?: Jogatina | null; lastAt?: string | null;
  /** Quem convidou você, se alguém convidou. */
  invitedBy?: PersonRef | null;
}
export interface ClubPerson extends PersonRef {
  role: 'dono' | 'membro'; firstTime?: boolean | null; stage: number; finishedAt?: string | null; joinedAt: string;
  journey?: { progress: number | null; completed: boolean | null } | null;
}
/** Mensagem de um grupo (clube ou jogatina). target: a de cima é uma postagem ('post'); as de baixo, respostas ('resposta'). */
export interface ClubMessage {
  id: string; part: number; parentId: string | null; question: boolean; target: 'post' | 'resposta'; body: string; images: string[]; deleted: boolean;
  createdAt: string; editedAt?: string | null; hidden: boolean; author: PersonRef; reactions: Reactions;
}
export type GroupMessage = ClubMessage;
/** Um jogo que o clube já jogou (cada jogo é uma rodada). */
export interface ClubRound { round: number; game: GameMini | null; startedAt: string; endedAt?: string | null; messages: number; jogatinas: number }
export interface ClubFull extends Club { locked: false; people: ClubPerson[]; messages: ClubMessage[]; hiddenParts: Record<string, number>; agenda: Jogatina[]; history: ClubRound[] }
export interface ClubLocked { locked: true; slug: string; name: string; access: ClubAccess; format: ClubFormat; game: GameMini | null; owner?: PersonRef | null }
/** O endereço era de um "Encontro de uma noite", que agora é uma jogatina. */
export interface ClubMoved { moved: string }
export interface ClubDraft {
  slug: string; name: string; description: string; format: ClubFormat; gameId: string | null; access: ClubAccess; maxMembers: number | null;
  communityId: string | null; schedule: string | null; liveUrl: string | null; parts: ClubPart[]; firstTime?: boolean; newCode?: boolean;
}

export const FORMATS: { k: ClubFormat; label: string; short: string; hint: string; side: string }[] = [
  { k: 'sem_pressa', label: 'Sem pressa', short: 'Sem pressa', hint: 'Como um clube do livro: o jogo em partes, cada um no seu ritmo, sem spoiler de quem está na frente.',
    side: 'Sem pressa: as partes têm data sugerida, nunca cobrança. Os avisos chegam só quando uma parte abre.' },
  { k: 'primeira_vez', label: 'Primeira vez juntos', short: 'Primeira vez', hint: 'Quem nunca jogou acompanhado por quem já zerou, os guias, que respondem sem entregar nada.',
    side: 'Primeira vez juntos: quem nunca jogou pergunta à vontade; os guias respondem sem entregar a história.' },
  { k: 'recorrente', label: 'Encontro recorrente', short: 'Recorrente', hint: 'Um grupo que joga junto de tempos em tempos: um combinado (ex.: sábados, 21h) e a agenda de jogatinas.',
    side: 'Encontro recorrente: o grupo se vê de tempos em tempos. Cada noite é uma jogatina na agenda do clube.' },
  { k: 'mes', label: 'Clube do mês', short: 'Do mês', hint: 'Um jogo por mês, escolhido pelo grupo. Acabou o mês, troca o jogo e as memórias ficam.',
    side: 'Clube do mês: um jogo por vez. Quando o mês acaba, quem criou troca o jogo e a conversa vai para as memórias.' },
];
export const FORMAT_LABEL = Object.fromEntries(FORMATS.map((f) => [f.k, f.label])) as Record<ClubFormat, string>;
export const FORMAT_SHORT = Object.fromEntries(FORMATS.map((f) => [f.k, f.short])) as Record<ClubFormat, string>;
export const ACCESS: { k: ClubAccess; label: string; hint: string }[] = [
  { k: 'aberto', label: 'Aberto', hint: 'Aparece na lista; qualquer pessoa entra.' },
  { k: 'amigos', label: 'Só amigos', hint: 'Só os seus amigos veem e entram.' },
  { k: 'convite', label: 'Por convite', hint: 'Não aparece na lista; entra quem tem o link.' },
];

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
  club_format: 'Escolha o ritmo do clube.',
  club_limit: 'Você já criou 5 clubes hoje. Volte amanhã.',
  club_closed: 'Esse clube é só para amigos de quem criou ou por convite.',
  club_full: 'As vagas desse clube acabaram.',
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
  invite_too_many: 'No máximo 20 pessoas por vez.',
  invite_limit: 'Você já mandou muitos convites hoje. Volte amanhã.',
};
export const okRpc = <T>(r: { data: T; error: { message: string } | null }, msgs: Record<string, string> = MSG): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(msgs).find((x) => m.includes(x)) ?? Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(msgs[k] ?? MSG[k]);
    if (/jogatina_|club_set_game|club_list\(text, text, integer, text\)/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0031 no Supabase.');
    if (/club_messages_of|relation "public.club_messages" does not exist/i.test(m)) throw new Error('Falta rodar a migração 0029 no Supabase.');
    if (/club_|my_news|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0031 no Supabase.');
    throw new Error(m);
  }
  return fixAuthors(r.data);
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => okRpc(await (await client()).rpc(fn, args)) as T;
const partsJson = (parts: ClubPart[]) => parts.map((p) => ({ title: p.title, suggestedOn: p.suggestedOn ?? '' }));
const draftJson = (d: ClubDraft) => ({
  slug: d.slug, name: d.name, description: d.description, format: d.format, gameId: d.gameId, access: d.access,
  maxMembers: d.maxMembers ?? '', communityId: d.communityId, schedule: d.schedule ?? '', liveUrl: d.liveUrl ?? '',
  parts: partsJson(d.parts), firstTime: d.firstTime ?? false, newCode: d.newCode ?? false,
});

export const clubApi = {
  async list(filter: 'todos' | 'meus' = 'todos', game?: string, community?: string): Promise<Club[]> {
    if (!supa()) return demo.list(filter, game, community);
    if (filter === 'meus' && !getState().profile) return [];
    return (await rpc<Club[] | null>('club_list', { p_filter: filter, p_game: game ?? null, p_limit: 60, p_community: community ?? null })) ?? [];
  },
  async get(slug: string, code?: string | null): Promise<ClubFull | ClubLocked | ClubMoved | null> {
    if (!supa()) return demo.get(slug);
    return rpc<ClubFull | ClubLocked | ClubMoved | null>('club_get', { p_slug: slug, p_code: code ?? null });
  },
  async create(d: ClubDraft): Promise<Club> {
    if (!supa()) return demo.create(d);
    return rpc<Club>('club_create', { p: draftJson(d) });
  },
  async update(id: string, d: ClubDraft): Promise<Club> {
    if (!supa()) return demo.update(id, d);
    return rpc<Club>('club_update', { p_id: id, p: draftJson(d) });
  },
  /** Troca o jogo atual: começa uma rodada nova; a conversa do jogo anterior vai para as memórias. */
  async setGame(id: string, gameId: string, parts: ClubPart[]): Promise<Club> {
    if (!supa()) return demo.setGame(id, gameId, parts);
    return rpc<Club>('club_set_game', { p_id: id, p_game: gameId, p_parts: partsJson(parts) });
  },
  async join(slug: string, code: string | null, firstTime: boolean | null): Promise<Club> {
    if (!supa()) return demo.join(slug, firstTime);
    return rpc<Club>('club_join', { p_slug: slug, p_code: code, p_first_time: firstTime });
  },
  /** Convida pelo @ (quem está no clube). A pessoa vê o clube, recebe o aviso e entra. */
  async invite(id: string, handles: string[]): Promise<{ sent: string[]; already: string[]; notFound: string[] }> {
    const clean = [...new Set(handles.map((h) => h.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))];
    if (!clean.length) return { sent: [], already: [], notFound: [] };
    if (!supa()) return demo.invite(id, clean);
    return rpc('club_invite', { p_id: id, p_handles: clean });
  },
  async leave(id: string): Promise<void> {
    if (!supa()) return demo.leave(id);
    await rpc('club_leave', { p_id: id });
  },
  async me(id: string, patch: { stage?: number; firstTime?: boolean; finished?: boolean }): Promise<Club> {
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
/* Demonstração                                                         */
/* ------------------------------------------------------------------ */
type DMember = { id: string; role: 'dono' | 'membro'; firstTime?: boolean | null; stage: number; finishedAt?: string | null; joinedAt: string };
type DRound = { round: number; gameId: string; startedAt: string; endedAt?: string | null };
type DClub = Omit<Club, 'game' | 'owner' | 'members' | 'me' | 'lastAt' | 'inviteCode' | 'next'> & { gameId: string; ownerId: string; people: DMember[]; extra: number; rounds: DRound[] };
type DMsg = { id: string; club: string; round: number; part: number; parentId: string | null; author: string; question: boolean; body: string; images: string[]; createdAt: string; editedAt?: string | null; deletedAt?: string | null };
type DB = { v: number; clubs: DClub[]; msgs: DMsg[] };
const KEY = 'wz.demo.clubes';
const VERSION = 3;
const ME = 'demo-me';
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const dayOffset = (d: number) => { const x = new Date(Date.now() + d * 86_400_000); return x.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); };
const rid = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const cleanParts = (parts: ClubPart[]) => parts.filter((p) => p.title.trim()).slice(0, 30).map((p, i) => ({ ordinal: i + 1, title: p.title.trim().slice(0, 80), suggestedOn: p.suggestedOn || null }));

function seed(): DB {
  const m = (id: string, role: 'dono' | 'membro', more: Partial<DMember> = {}): DMember => ({ id, role, stage: 0, joinedAt: hoursAgo(24 * 5), ...more });
  const base = { maxMembers: null, community: null, liveUrl: null, hidden: false, access: 'aberto' as ClubAccess, parts: [] as ClubPart[], schedule: null, round: 1 };
  const clubs: DClub[] = [
    { ...base, id: 'k-elden', slug: 'elden-sem-pressa', name: 'Elden Ring sem pressa', description: 'Um mês e meio para atravessar as Terras Intermédias, cada um no seu ritmo.', format: 'sem_pressa', gameId: 'elden',
      community: { slug: 'elden-ring', name: 'Elden Ring' }, createdAt: hoursAgo(24 * 20), ownerId: 'demo-carol', extra: 14, rounds: [{ round: 1, gameId: 'elden', startedAt: hoursAgo(24 * 20) }],
      parts: [{ ordinal: 1, title: 'Até a Margit', suggestedOn: dayOffset(-14) }, { ordinal: 2, title: 'Liurnia e a Academia', suggestedOn: dayOffset(-7) },
        { ordinal: 3, title: 'A capital', suggestedOn: dayOffset(0) }, { ordinal: 4, title: 'Até o final', suggestedOn: dayOffset(14) }],
      people: [m('demo-carol', 'dono', { stage: 3 }), m('demo-duda', 'membro', { stage: 4, finishedAt: hoursAgo(48) }), m(ME, 'membro', { stage: 2 }), m('demo-rafa', 'membro', { stage: 1 })] },
    { ...base, id: 'k-retro', slug: 'clube-retro', name: 'Clube Retrô', description: 'Uma vez por semana, um clássico do PS1 ao PS3. Cada um no seu console, a conversa aqui.', format: 'recorrente', gameId: 'kz2',
      schedule: 'Sábados, 21h', round: 2, community: { slug: 'retro', name: 'Retrô' }, createdAt: hoursAgo(24 * 40), ownerId: 'demo-carol', extra: 5,
      rounds: [{ round: 1, gameId: 'dderby', startedAt: hoursAgo(24 * 40), endedAt: hoursAgo(24 * 10) }, { round: 2, gameId: 'kz2', startedAt: hoursAgo(24 * 10) }],
      people: [m('demo-carol', 'dono'), m(ME, 'membro'), m('demo-rafa', 'membro'), m('demo-duda', 'membro')] },
    { ...base, id: 'k-tlou', slug: 'primeira-vez-tlou-2', name: 'Primeira vez em The Last of Us Part II', description: 'Para quem nunca jogou. Guias respondem sem entregar a história.', format: 'primeira_vez', gameId: 'tlou2',
      createdAt: hoursAgo(24 * 12), ownerId: 'demo-duda', extra: 6, rounds: [{ round: 1, gameId: 'tlou2', startedAt: hoursAgo(24 * 12) }],
      people: [m('demo-duda', 'dono', { firstTime: false }), m('demo-carol', 'membro', { firstTime: false }), m(ME, 'membro', { firstTime: true }),
        m('demo-rafa', 'membro', { firstTime: true, finishedAt: hoursAgo(26) })] },
    { ...base, id: 'k-mes', slug: 'jogo-do-mes', name: 'O jogo do mês', description: 'Todo mês o grupo escolhe um jogo curto. Em outubro: Yakuza Kiwami.', format: 'mes', gameId: 'yakuza',
      createdAt: hoursAgo(24 * 70), ownerId: 'demo-duda', extra: 11, round: 3,
      rounds: [{ round: 1, gameId: 'infamous', startedAt: hoursAgo(24 * 70), endedAt: hoursAgo(24 * 40) }, { round: 2, gameId: 'mgs2', startedAt: hoursAgo(24 * 40), endedAt: hoursAgo(24 * 12) }, { round: 3, gameId: 'yakuza', startedAt: hoursAgo(24 * 12) }],
      parts: [{ ordinal: 1, title: 'Capítulos 1 a 4', suggestedOn: dayOffset(-5) }, { ordinal: 2, title: 'Capítulos 5 a 9', suggestedOn: dayOffset(3) }, { ordinal: 3, title: 'Até o final', suggestedOn: dayOffset(12) }],
      people: [m('demo-duda', 'dono', { stage: 2 }), m('demo-carol', 'membro', { stage: 1 })] },
  ];
  const x = (id: string, club: string, author: string, h: number, body: string, more: Partial<DMsg> = {}): DMsg => ({ id, club, round: 1, part: 0, parentId: null, author, question: false, body, images: [], createdAt: hoursAgo(h), ...more });
  const msgs: DMsg[] = [
    x('e1', 'k-elden', 'demo-carol', 24 * 19, 'Boas-vindas! Combinado: spoiler só dentro da conversa de cada parte.'),
    x('e2', 'k-elden', 'demo-carol', 24 * 12, 'Margit caiu na 6ª tentativa. Usei a cinza do lobo.', { part: 1 }),
    x('e3', 'k-elden', 'demo-duda', 24 * 11, 'Eu fui com o escudo grande. Lento, mas seguro.', { part: 1, parentId: 'e2' }),
    x('e4', 'k-elden', 'demo-duda', 24 * 6, 'A Academia de Raya Lucaria é o lugar mais bonito do jogo.', { part: 2 }),
    x('e5', 'k-elden', 'demo-carol', 30, 'Cheguei na capital. Que escala!', { part: 3 }),
    x('e6', 'k-elden', 'demo-duda', 24 * 2, 'Zerei. O final da Ranni vale cada passo.', { part: 4 }),
    x('e7', 'k-elden', 'demo-rafa', 20, 'Alguém topa matar a Rennala em cooperativo no sábado? Marquei na agenda do clube.'),
    x('r0', 'k-retro', 'demo-carol', 24 * 30, 'Derby fechado! Obrigada a todo mundo pelas noites no estádio.', { round: 1 }),
    x('r1', 'k-retro', 'demo-carol', 24 * 9, 'Jogo novo: Killzone 2. Campanha em casa e o multiplayer do fan-server no sábado.', { round: 2 }),
    x('r2', 'k-retro', 'demo-rafa', 24 * 8, 'A campanha ainda impressiona. Aquele peso da arma!', { round: 2 }),
    x('r3', 'k-retro', ME, 24 * 8 - 2, 'Concordo. Jogando no PS3 original, inclusive.', { round: 2, parentId: 'r2' }),
    x('t1', 'k-tlou', ME, 24 * 3, 'Vale explorar tudo ou seguir a história? Não quero perder nada importante.', { question: true }),
    x('t2', 'k-tlou', 'demo-duda', 24 * 3 - 2, 'Explore! Os lugares contam muita coisa em bilhetes e detalhes. Não tem nada que você perca para sempre por não correr.', { parentId: 't1' }),
    x('t3', 'k-tlou', 'demo-carol', 24 * 3 - 1, 'Só um aviso: ||tem um momento no meio em que você muda de ponto de vista||. Vá sem medo.', { parentId: 't1' }),
    x('t4', 'k-tlou', 'demo-rafa', 26, 'Zerei pela primeira vez. Não estava pronto para aquele final.'),
    x('y1', 'k-mes', 'demo-duda', 24 * 11, 'Outubro é de Yakuza! Quem nunca jogou a série, este é um ótimo começo.', { round: 3 }),
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
  const db = loadDb();
  return {
    id: c.id, slug: c.slug, name: c.name, description: c.description, format: c.format, game: demoGameMini(c.gameId), access: c.access,
    maxMembers: c.maxMembers, community: c.community, schedule: c.schedule, round: c.round, liveUrl: c.liveUrl,
    createdAt: c.createdAt, hidden: c.hidden, owner: demoPersonRef(c.ownerId), members: c.people.length + c.extra,
    me: me ? { role: me.role, firstTime: me.firstTime, stage: me.stage, finishedAt: me.finishedAt } : null,
    inviteCode: c.ownerId === ME ? 'demo' : null, parts: c.parts, next: demoClubAgenda(c.id)[0] ?? null,
    lastAt: db.msgs.filter((x) => x.club === c.id && !x.deletedAt).map((x) => x.createdAt).sort().pop() ?? null,
  };
}

/** Na demonstração, para as jogatinas: nome e endereço do clube, e se você está nele. */
export function demoClubRef(id: string): { slug: string; name: string; member: boolean } | null {
  const c = loadDb().clubs.find((x) => x.id === id);
  return c ? { slug: c.slug, name: c.name, member: c.people.some((p) => p.id === ME) } : null;
}

const demo = {
  list(filter: 'todos' | 'meus', game?: string, community?: string): Club[] {
    const db = loadDb();
    let l = db.clubs.filter((c) => !c.hidden);
    if (game) l = l.filter((c) => c.gameId === game || demoGameMini(c.gameId)?.slug === game);
    if (community) l = l.filter((c) => c.community?.slug === community);
    const out = l.map(clubOut);
    return (filter === 'meus' ? out.filter((c) => c.me) : out).sort((a, b) => (b.lastAt ?? b.createdAt).localeCompare(a.lastAt ?? a.createdAt));
  },
  get(slug: string): ClubFull | ClubMoved | null {
    const db = loadDb(); const c = db.clubs.find((x) => x.slug === slug.toLowerCase());
    if (!c) {
      const legacy: Record<string, string> = { 'noite-de-astro-bot': 'j-astro', 'derby-de-sexta': 'j-derby' };
      return legacy[slug] ? { moved: legacy[slug] } : null;
    }
    const me = c.people.find((p) => p.id === ME);
    const stage = me?.stage ?? 0;
    const cur = db.msgs.filter((x) => x.club === c.id && x.round === c.round);
    const msgs = cur.filter((x) => (x.part === 0 || (me && x.part <= stage)) && (!x.deletedAt || cur.some((k) => k.parentId === x.id && !k.deletedAt)));
    const hidden: Record<string, number> = {};
    cur.filter((x) => x.part > (me ? stage : 0) && !x.deletedAt).forEach((x) => { hidden[x.part] = (hidden[x.part] ?? 0) + 1; });
    const reacts = (x: DMsg): Reactions => demoReactions(x.parentId ? 'resposta' : 'post', x.id);
    const past = demoClubPast(c.id);
    return {
      ...clubOut(c), locked: false,
      people: c.people.map((p) => ({ ...demoPersonRef(p.id), role: p.role, firstTime: p.firstTime, stage: p.stage, finishedAt: p.finishedAt, joinedAt: p.joinedAt, journey: null })),
      messages: msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((x) => ({ id: x.id, part: x.part, parentId: x.parentId, question: x.question, target: x.parentId ? 'resposta' as const : 'post' as const, body: x.deletedAt ? '' : x.body, images: x.deletedAt ? [] : x.images, deleted: !!x.deletedAt, createdAt: x.createdAt, editedAt: x.editedAt ?? null, hidden: false, author: demoPersonRef(x.author), reactions: reacts(x) })),
      hiddenParts: hidden,
      agenda: demoClubAgenda(c.id),
      history: c.rounds.filter((r) => r.round < c.round).sort((a, b) => b.round - a.round).map((r) => ({
        round: r.round, game: demoGameMini(r.gameId), startedAt: r.startedAt, endedAt: r.endedAt ?? null,
        messages: db.msgs.filter((x) => x.club === c.id && x.round === r.round && !x.parentId && !x.deletedAt).length,
        jogatinas: past.filter((j) => j.startsAt >= r.startedAt && (!r.endedAt || j.startsAt < r.endedAt)).length,
      })),
    };
  },
  create(d: ClubDraft): Club {
    const db = loadDb();
    if (!slugOk(d.slug)) err('slug_invalid');
    if (db.clubs.some((c) => c.slug === d.slug)) err('slug_taken');
    if (d.name.trim().length < 3 || d.name.trim().length > 60) err('name_invalid');
    if (!d.gameId) err('game_needed');
    const now = new Date().toISOString();
    const c: DClub = {
      id: `k-${d.slug}`, slug: d.slug, name: d.name.trim(), description: d.description.trim().slice(0, 500), format: d.format, gameId: d.gameId!, access: d.access,
      maxMembers: d.maxMembers, community: null, schedule: d.schedule?.trim().slice(0, 80) || null, round: 1, liveUrl: d.liveUrl,
      createdAt: now, hidden: false, ownerId: ME, extra: 0, parts: cleanParts(d.parts), rounds: [{ round: 1, gameId: d.gameId!, startedAt: now }],
      people: [{ id: ME, role: 'dono', firstTime: d.format === 'primeira_vez' ? !!d.firstTime : null, stage: 0, joinedAt: now }],
    };
    db.clubs.push(c); saveDb(db); return clubOut(c);
  },
  update(id: string, d: ClubDraft): Club {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    if (!c) err('target_not_found');
    if (c.ownerId !== ME) err('not_owner');
    if (d.name.trim().length < 3 || d.name.trim().length > 60) err('name_invalid');
    Object.assign(c, { name: d.name.trim(), description: d.description.trim().slice(0, 500), format: d.format, access: d.access, maxMembers: d.maxMembers, schedule: d.schedule?.trim().slice(0, 80) || null, liveUrl: d.liveUrl });
    c.parts = cleanParts(d.parts);
    saveDb(db); return clubOut(c);
  },
  setGame(id: string, gameId: string, parts: ClubPart[]): Club {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    if (!c) err('target_not_found');
    if (c.ownerId !== ME) err('not_owner');
    if (gameId === c.gameId) return clubOut(c);
    const now = new Date().toISOString();
    const cur = c.rounds.find((r) => r.round === c.round); if (cur) cur.endedAt = now;
    c.round += 1; c.gameId = gameId; c.rounds.push({ round: c.round, gameId, startedAt: now });
    c.parts = cleanParts(parts);
    c.people.forEach((p) => { p.stage = 0; p.finishedAt = null; });
    saveDb(db); return clubOut(c);
  },
  join(slug: string, firstTime: boolean | null): Club {
    const db = loadDb(); const c = db.clubs.find((x) => x.slug === slug);
    if (!c) err('target_not_found');
    if (!c.people.some((p) => p.id === ME)) {
      if (c.maxMembers && c.people.length + c.extra >= c.maxMembers) err('club_full');
      c.people.push({ id: ME, role: 'membro', firstTime: c.format === 'primeira_vez' ? firstTime ?? true : null, stage: 0, joinedAt: new Date().toISOString() });
      saveDb(db);
    }
    return clubOut(c);
  },
  invite(id: string, handles: string[]) {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    if (!c || !c.people.some((p) => p.id === ME)) err('not_member');
    const r = { sent: [] as string[], already: [] as string[], notFound: [] as string[] };
    for (const h of handles) {
      const who = DEMO_PEOPLE.find((p) => p.handle.toLowerCase() === h)?.id ?? (h === 'lu' ? 'demo-lu' : null);
      if (!who) r.notFound.push(h); else if (c!.people.some((p) => p.id === who)) r.already.push(h); else r.sent.push(h);
    }
    return r;
  },
  leave(id: string) {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    if (!c) return;
    if (c.ownerId === ME) err('owner_leave');
    c.people = c.people.filter((p) => p.id !== ME); saveDb(db);
  },
  me(id: string, patch: { stage?: number; firstTime?: boolean; finished?: boolean }): Club {
    const db = loadDb(); const c = db.clubs.find((x) => x.id === id);
    const p = c?.people.find((x) => x.id === ME);
    if (!c || !p) err('not_member');
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
    const m: DMsg = { id: rid(), club: clubId, round: c!.round, part: p, parentId: parent, author: ME, question: question && !parent, body: t, images: images.slice(0, 4), createdAt: new Date().toISOString() };
    db.msgs.push(m); saveDb(db);
    return { id: m.id, part: m.part, parentId: m.parentId, question: m.question, target: m.parentId ? 'resposta' : 'post', body: m.body, images: m.images, deleted: false, createdAt: m.createdAt, editedAt: null, hidden: false, author: demoPersonRef(ME), reactions: { mine: [] } };
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

/** Avisos dos clubes na demonstração: respostas às suas mensagens, menções e parte que abriu. */
export async function demoClubNews(seenAt: string): Promise<ReplyNews> {
  const db = loadDb(); const now = Date.now();
  const items: NewsItem[] = [];
  for (const c of db.clubs) {
    const me = c.people.find((p) => p.id === ME);
    if (!me) continue;
    const myHandle = (demoPersonRef(ME).handle ?? '').toLowerCase();
    for (const x of db.msgs.filter((k) => k.club === c.id && k.round === c.round && k.author !== ME && !k.deletedAt && Date.parse(k.createdAt) > now - 30 * 86_400_000)) {
      const parent = x.parentId ? db.msgs.find((k) => k.id === x.parentId) : null;
      if (parent?.author === ME) items.push({ kind: 'clube_resposta', id: x.id, ref: String(x.part), slug: c.slug, title: c.name, excerpt: x.body.slice(0, 140), at: x.createdAt, author: demoPersonRef(x.author) });
      else if ((x.part === 0 || x.part <= me.stage) && mentionsOf(x.body).some((h) => h.toLowerCase() === myHandle)) items.push({ kind: 'clube_mencao', id: x.id, ref: String(x.part), slug: c.slug, title: c.name, excerpt: x.body.slice(0, 140), at: x.createdAt, author: demoPersonRef(x.author) });
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

/** "Baixar tudo" na demonstração: seus clubes e o que você escreveu neles. */
export async function demoClubData(): Promise<Record<string, unknown>> {
  const db = loadDb();
  const name = (id: string) => db.clubs.find((c) => c.id === id);
  return {
    clubes: db.clubs.filter((c) => c.people.some((p) => p.id === ME)).map((c) => { const p = c.people.find((x) => x.id === ME)!; return { endereco: `clube/${c.slug}`, nome: c.name, papel: p.role, ritmo: c.format, primeiraVez: p.firstTime ?? null, parte: p.stage, terminouEm: p.finishedAt ?? null, entrouEm: p.joinedAt, criado: c.ownerId === ME }; }),
    mensagensNosClubes: db.msgs.filter((x) => x.author === ME).map((x) => ({ id: x.id, onde: `clube/${name(x.club)?.slug ?? ''}`, parteDoClube: x.part, resposta: !!x.parentId, texto: x.body, imagens: x.images, criadaEm: x.createdAt, editadaEm: x.editedAt ?? null, apagadaEm: x.deletedAt ?? null })),
  };
}
