/**
 * Comunidades com tema (Etapa 6, entregas 4 e A). Comunidades em /w/nome, postagens, respostas em fio e reações.
 * Com conta, tudo passa pelas funções do banco (migrações 0026 e 0029). Na demonstração, fica neste navegador, com
 * comunidades e conversas de exemplo (@duda, @carol e @rafa).
 */
import { useSyncExternalStore } from 'react';
import { getState } from './store';
import { demoGames } from './demo';
import { DEMO_PEOPLE, demoFollowing, demoIsFriend } from './demoPeople';
import type { CommunityPrefs } from './types';
import { SUPABASE_URL } from '../lib/env';
import { mentionsOf } from '../lib/postText';

export type PostKind = 'discussao' | 'pergunta' | 'dica' | 'colecao' | 'clipe' | 'enquete' | 'aquisicao';
export type SpoilerLevel = 'inicio' | 'meio' | 'final';
export type ReactionKind = 'gg' | 'coracao' | 'jogar' | 'dica' | 'junto' | 'haha' | 'momento';
/** gone: a conta foi apagada; a conversa fica, sem nome. */
export interface PersonRef { id: string; handle: string | null; avatar?: string | null; admin?: boolean; gone?: boolean; novo?: boolean }
export interface GameMini { id: string; slug: string; title: string; cover?: string | null }
export type Reactions = { mine: ReactionKind[] } & Partial<Record<ReactionKind, number>>;
/** As reações, na ordem em que aparecem. Curti é o coração de sempre (guardado como "coracao"). */
export const REACTIONS: { k: ReactionKind; label: string; icon: string; hint: string }[] = [
  { k: 'gg', label: 'GG', icon: '', hint: 'GG: mandou bem' },
  { k: 'coracao', label: 'Curti', icon: 'coracao', hint: 'Curti' },
  { k: 'jogar', label: 'Quero jogar', icon: 'jogos', hint: 'Quero jogar: o jogo vai para os seus desejos (ou para o Radar, se ainda não saiu)' },
  { k: 'dica', label: 'Boa dica', icon: 'lampada', hint: 'Boa dica' },
  { k: 'junto', label: 'Tamo junto', icon: 'pessoas', hint: 'Tamo junto' },
  { k: 'haha', label: 'Haha', icon: 'riso', hint: 'Haha' },
  { k: 'momento', label: 'Que momento', icon: 'brilho', hint: 'Que momento' },
];
export const REACTION_KINDS = REACTIONS.map((r) => r.k);
/** Pessoa de uma conta que foi apagada. */
export const GONE: PersonRef = { id: '', handle: null, avatar: null, admin: false, gone: true };
export interface Community {
  id: string; slug: string; name: string; description: string; rules: string; cover?: string | null; official: boolean;
  game?: GameMini | null; createdAt: string; hidden: boolean; owner?: PersonRef | null; members: number; posts: number;
  lastAt?: string | null; role?: 'dono' | 'membro' | null;
}
export interface Poll { options: { text: string; votes: number }[]; total: number; mine: number | null }
/**
 * Postagem da Praça (community null) ou de uma comunidade. Título opcional.
 * why: por que apareceu no caminho; authorCtx: "jogando" ou "zerou" o jogo da conversa (só se a pessoa ligou);
 * readAt e unread: a última visita e as respostas novas desde ela.
 */
export interface Post {
  id: string; kind: PostKind; title: string | null; body: string; game?: GameMini | null; spoiler?: SpoilerLevel | null; spoilerNote?: string | null;
  images: string[]; imageCount: number; clip?: string | null; pinned: boolean; answerId?: string | null;
  createdAt: string; editedAt?: string | null; hidden: boolean; author: PersonRef; authorCtx?: string | null;
  community: { slug: string; name: string; official: boolean } | null; replies: number; lastReplyAt?: string | null; reactions: Reactions;
  poll?: Poll | null; saved?: boolean; following?: boolean; readAt?: string | null; unread?: number; why?: string | null;
}
export interface Reply {
  id: string; parentId: string | null; body: string; deleted: boolean; createdAt: string; editedAt?: string | null;
  hidden: boolean; author: PersonRef; authorCtx?: string | null; reactions: Reactions;
}
export interface PostFull extends Post { communityFull: Community | null; canModerate: boolean; thread: Reply[] }
/** Caminhos da Praça. Comunidades e Jogatinas mostram listas próprias; os outros, conversas. */
export type PracaPath = 'para' | 'amigos' | 'seguindo' | 'comunidades' | 'discussoes' | 'jogatinas' | 'salvos' | 'novos';
export const PATHS: { k: PracaPath; label: string; icon: string; why: string }[] = [
  { k: 'para', label: 'Para você', icon: 'jornada', why: 'O que tem a ver com você (comunidades e pessoas que você segue, jogos da sua Jornada, Coleção e desejos) e o resto da Praça, de quem você ainda não segue. Cada conversa diz por que apareceu.' },
  { k: 'amigos', label: 'Amigos', icon: 'coracao', why: 'Só o que os seus amigos (quem segue você de volta) publicaram, do mais novo para o mais antigo.' },
  { k: 'seguindo', label: 'Seguindo', icon: 'olho', why: 'Pessoas e comunidades que você segue. Sem sugestão nenhuma no meio.' },
  { k: 'comunidades', label: 'Comunidades', icon: 'grade', why: 'Os espaços por assunto. Seguir não é virar membro: só acompanha o que sai ali.' },
  { k: 'discussoes', label: 'Discussões', icon: 'comunidade', why: 'As conversas mais vivas da semana e as antigas que voltaram a render.' },
  { k: 'jogatinas', label: 'Jogatinas', icon: 'jogos', why: 'Ocasiões concretas para jogar junto: jogo, quando e quem vai.' },
  { k: 'salvos', label: 'Salvos', icon: 'desejo', why: 'O que você guardou para ler depois. Só você vê.' },
  { k: 'novos', label: 'Novos por aqui', icon: 'eventos', why: 'As primeiras conversas de quem acabou de chegar e topou aparecer aqui.' },
];
/** Os cantos da Praça. */
export interface PracaSide { entrar: Post[]; continuam: Post[]; novos: (PersonRef & { since: string; post?: { id: string; title: string } | null })[] }
export interface CommunityPage { community: Community; pinned: Post[]; posts: Post[] }
/** Avisos do menu: respostas e menções (comunidades e clubes), encontro chegando e parte do clube que abriu. */
export type NewsKind = 'resposta' | 'acompanhando' | 'clube_resposta' | 'mencao' | 'clube_mencao' | 'encontro' | 'parte';
export interface NewsItem { kind: NewsKind; id: string; ref: string; slug: string; title: string; excerpt?: string | null; at: string; new?: boolean; author?: PersonRef | null }
export interface ReplyNews { count: number; items: NewsItem[] }
export interface PostDraft { kind: PostKind; title: string; body: string; gameId: string | null; spoiler: SpoilerLevel | null; spoilerNote?: string | null; images: string[]; clip: string | null; poll?: string[] | null }
export interface CommunityDraft { slug: string; name: string; description: string; rules: string; gameId: string | null; cover?: string | null }

export const KINDS: { k: PostKind; label: string; hint: string }[] = [
  { k: 'discussao', label: 'Discussão', hint: 'Puxar um assunto para conversar.' },
  { k: 'pergunta', label: 'Pergunta', hint: 'Quem perguntou marca a resposta que resolveu a dúvida.' },
  { k: 'dica', label: 'Dica', hint: 'Um macete, um caminho, um aviso útil.' },
  { k: 'colecao', label: 'Minha coleção', hint: 'Mostrar a prateleira, uma edição, um achado.' },
  { k: 'clipe', label: 'Vídeo ou clipe', hint: 'YouTube, Twitch, TikTok, Instagram, X e outros.' },
  { k: 'enquete', label: 'Enquete', hint: 'Uma pergunta com até 6 opções para votar.' },
  { k: 'aquisicao', label: 'Chegou na coleção', hint: 'Um jogo que acabou de chegar: achado, presente, edição especial.' },
];
export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.k, k.label])) as Record<PostKind, string>;
export const SPOILERS: { k: SpoilerLevel; label: string; hint: string }[] = [
  { k: 'inicio', label: 'Do começo', hint: 'Coisas das primeiras horas.' },
  { k: 'meio', label: 'Do meio', hint: 'Até a metade do jogo.' },
  { k: 'final', label: 'Do final', hint: 'O fim, a virada, o que só quem zerou sabe.' },
];
export const SPOILER_LABEL = Object.fromEntries(SPOILERS.map((k) => [k.k, k.label])) as Record<SpoilerLevel, string>;
export const MAX_IMAGES = 4;

/** Endereço da conversa (vale para a Praça e para as comunidades). */
export const postHref = (p: Pick<Post, 'id'>) => `/conversa/${p.id}`;
/** Título para mostrar: o da postagem ou o começo do texto. */
export function postTitle(p: Pick<Post, 'title' | 'body' | 'kind'>): string {
  if (p.title) return p.title;
  const t = p.body.replace(/\|\|[\s\S]+?\|\|/g, '[spoiler]').replace(/[*>#]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  return t ? (t.length > 90 ? `${t.slice(0, 90).trimEnd()}…` : t) : p.kind === 'enquete' ? 'Enquete' : 'Postagem';
}

/** Endereço público de uma imagem (caminho no bucket 'comunidade', ou a própria imagem na demonstração). */
export function communityImage(v?: string | null): string | null {
  if (!v) return null;
  if (/^(data:|https?:|blob:|\/)/.test(v)) return v;
  return `${SUPABASE_URL}/storage/v1/object/public/comunidade/${v}`;
}

/** O que dá para usar como nome da comunidade no endereço: minúsculas, números e hífen. */
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/, '');
}
export const slugOk = (s: string) => /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(s) && !s.includes('--');
/** Link do vídeo ou post: endereço completo. O que o site sabe mostrar dentro da página está em lib/embeds. */
export const clipOk = (u: string) => /^https:\/\/[^\s<>"]{4,290}$/.test(u.trim());

const MSG: Record<string, string> = {
  not_logged: 'Entre na sua conta para participar.',
  handle_needed: 'Escolha o seu @ antes de publicar.',
  rules_needed: 'Aceite as regras da comunidade para publicar.',
  suspended: 'O seu perfil está suspenso pela moderação; por enquanto não dá para publicar.',
  slug_invalid: 'O endereço precisa ter de 3 a 32 letras, números ou hífens.',
  slug_offensive: 'Esse endereço tem uma palavra que não pode.',
  slug_reserved: 'Esse endereço é reservado. Escolha outro.',
  slug_taken: 'Já existe uma comunidade com esse endereço.',
  name_invalid: 'O nome precisa ter de 3 a 48 caracteres.',
  text_offensive: 'O texto tem uma palavra que não pode.',
  community_limit: 'Você já criou 3 comunidades hoje. Volte amanhã.',
  not_owner: 'Só quem criou a comunidade pode fazer isso.',
  owner_leave: 'Quem criou a comunidade não pode sair dela.',
  official_only: 'Na comunidade oficial, só o canal publica. Dá para responder às postagens.',
  title_invalid: 'O título precisa ter de 3 a 140 caracteres.',
  title_offensive: 'O título tem uma palavra que não pode.',
  body_long: 'O texto passou do limite de 10 mil caracteres.',
  body_invalid: 'Escreva alguma coisa (até 5 mil caracteres).',
  clip_invalid: 'Cole o endereço completo do vídeo ou post, começando com https://',
  clip_needed: 'Cole o link do vídeo ou do post.',
  image_limit: `No máximo ${MAX_IMAGES} imagens por postagem.`,
  image_path: 'Não deu para usar essa imagem. Envie de novo.',
  post_limit: 'Você já publicou 20 postagens hoje. Volte amanhã.',
  reply_limit: 'Muitas respostas em pouco tempo. Espere um pouco.',
  public_limit: 'Conta nova tem um limite de publicações por hora. Espere um pouco.',
  pin_limit: 'Já há 3 postagens fixadas. Solte uma antes.',
  not_author: 'Só quem escreveu pode fazer isso.',
  not_member: 'Entre no clube para reagir às mensagens dele.',
  poll_invalid: 'A enquete precisa de 2 a 6 opções, com até 80 caracteres cada.',
  poll_question: 'Escreva a pergunta da enquete.',
  game_needed: 'Escolha o jogo que chegou na coleção.',
  post_empty: 'Escreva alguma coisa (ou ponha uma imagem ou um link).',
  react_kind: 'Essa reação não existe. Atualize a página.',
  target_not_found: 'Não achei. Talvez tenha sido apagado.',
};
/** Conta apagada: o banco devolve author null; o site mostra "Conta apagada". */
export function fixAuthors<T>(x: T): T {
  if (Array.isArray(x)) { x.forEach(fixAuthors); return x; }
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      if (k === 'author' && o[k] == null) o[k] = { ...GONE };
      else if (o[k] && typeof o[k] === 'object') fixAuthors(o[k]);
    }
  }
  return x;
}
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/praca_feed|praca_side|poll_vote|post_save|post_follow|post_read|p_poll/i.test(m)) throw new Error('Falta rodar a migração 0030 no Supabase.');
    if (/p_spoiler_note|my_community_data|reactions_kind_check|club_messages_of/i.test(m)) throw new Error('Falta rodar a migração 0029 no Supabase.');
    if (/communit|post_|reply_|react|game_posts|my_reply_news|replies_seen|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0026 no Supabase.');
    throw new Error(m);
  }
  return fixAuthors(r.data);
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => ok(await (await client()).rpc(fn, args)) as T;

/* ------------------------------------------------------------------ */
/* Avisos de resposta, compartilhados pelas telas                       */
/* ------------------------------------------------------------------ */
let news: ReplyNews | null = null;
let newsLoading = false;
const newsSubs = new Set<() => void>();
const emitNews = () => newsSubs.forEach((f) => f());
export async function refreshNews(): Promise<ReplyNews | null> {
  try { news = await communityApi.news(); } catch { news = { count: 0, items: [] }; }
  emitNews();
  return news;
}
export function useReplyNews(): ReplyNews | null {
  return useSyncExternalStore((f) => {
    newsSubs.add(f);
    const s = getState();
    if (!news && !newsLoading && (s.mode === 'demo' || s.profile)) { newsLoading = true; void refreshNews().finally(() => { newsLoading = false; }); }
    return () => { newsSubs.delete(f); };
  }, () => news, () => null);
}

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */
export const communityApi = {
  async list(q = ''): Promise<Community[]> {
    if (!supa()) return demo.list(q);
    return (await rpc<Community[] | null>('community_list', { p_q: q || null, p_limit: 120 })) ?? [];
  },
  async mine(): Promise<Community[]> {
    if (!supa()) return demo.mine();
    if (!getState().profile) return [];
    return (await rpc<Community[] | null>('my_communities')) ?? [];
  },
  async page(slug: string, sort: 'recentes' | 'conversadas' = 'recentes', before?: string): Promise<CommunityPage | null> {
    if (!supa()) return demo.page(slug, sort, before);
    return rpc<CommunityPage | null>('community_posts', { p_slug: slug, p_sort: sort, p_before: before ?? null, p_limit: 30 });
  },
  async get(slug: string): Promise<Community | null> {
    if (!supa()) return demo.get(slug);
    return rpc<Community | null>('community_get', { p_slug: slug });
  },
  async create(d: CommunityDraft): Promise<Community> {
    if (!supa()) return demo.create(d);
    return rpc<Community>('community_create', { p_slug: d.slug, p_name: d.name, p_description: d.description, p_rules: d.rules, p_game: d.gameId });
  },
  async update(id: string, d: CommunityDraft): Promise<Community> {
    if (!supa()) return demo.update(id, d);
    return rpc<Community>('community_update', { p_id: id, p_name: d.name, p_description: d.description, p_rules: d.rules, p_game: d.gameId, p_cover: d.cover ?? null });
  },
  async setOfficial(id: string, on: boolean): Promise<void> {
    if (!supa()) return demo.setOfficial(id, on);
    await rpc('community_set_official', { p_id: id, p_on: on });
  },
  async join(id: string, on: boolean): Promise<Community> {
    if (!supa()) return demo.join(id, on);
    return rpc<Community>('community_join', { p_id: id, p_on: on });
  },
  async post(id: string): Promise<PostFull | null> {
    if (!supa()) return demo.post(id);
    return rpc<PostFull | null>('post_get', { p_id: id });
  },
  /** communityId null = direto na Praça. */
  async createPost(communityId: string | null, d: PostDraft): Promise<Post> {
    if (!supa()) return demo.createPost(communityId, d);
    return rpc<Post>('post_create', { p_community: communityId, p_kind: d.kind, p_title: d.title || null, p_body: d.body, p_game: d.gameId, p_spoiler: d.spoiler, p_spoiler_note: d.spoilerNote ?? null, p_images: d.images, p_clip: d.clip, p_poll: d.kind === 'enquete' ? d.poll ?? [] : null });
  },
  async editPost(id: string, d: PostDraft, removed: string[] = []): Promise<Post> {
    if (!supa()) return demo.editPost(id, d);
    const p = await rpc<Post>('post_edit', { p_id: id, p_kind: d.kind, p_title: d.title || null, p_body: d.body, p_game: d.gameId, p_spoiler: d.spoiler, p_spoiler_note: d.spoilerNote ?? null, p_images: d.images, p_clip: d.clip, p_poll: d.kind === 'enquete' ? d.poll ?? null : null });
    if (removed.length) await removeImages(removed);
    return p;
  },
  async deletePost(id: string): Promise<void> {
    if (!supa()) return demo.deletePost(id);
    const imgs = await rpc<string[] | null>('post_delete', { p_id: id });
    if (imgs?.length) await removeImages(imgs);
  },
  async pin(id: string, on: boolean): Promise<void> {
    if (!supa()) return demo.pin(id, on);
    await rpc('post_pin', { p_id: id, p_on: on });
  },
  async answer(postId: string, replyId: string | null): Promise<void> {
    if (!supa()) return demo.answer(postId, replyId);
    await rpc('post_answer', { p_id: postId, p_reply: replyId });
  },
  async reply(postId: string, parentId: string | null, body: string): Promise<Reply> {
    if (!supa()) return demo.reply(postId, parentId, body);
    return rpc<Reply>('reply_create', { p_post: postId, p_parent: parentId, p_body: body });
  },
  async editReply(id: string, body: string): Promise<void> {
    if (!supa()) return demo.editReply(id, body);
    await rpc('reply_edit', { p_id: id, p_body: body });
  },
  async deleteReply(id: string): Promise<void> {
    if (!supa()) return demo.deleteReply(id);
    await rpc('reply_delete', { p_id: id });
  },
  async react(target: 'post' | 'resposta', id: string, kind: ReactionKind, on: boolean): Promise<Reactions> {
    if (!supa()) return demo.react(target, id, kind, on);
    return rpc<Reactions>('react', { p_target: target, p_id: id, p_kind: kind, p_on: on });
  },
  /** Um caminho da Praça (as conversas, com o motivo de cada uma). */
  async praca(path: PracaPath, before?: string): Promise<Post[]> {
    if (!supa()) return demo.praca(path, before);
    if (!getState().profile) return [];
    return (await rpc<Post[] | null>('praca_feed', { p_path: path, p_before: before ?? null, p_limit: 30 })) ?? [];
  },
  async side(): Promise<PracaSide> {
    if (!supa()) return demo.side();
    if (!getState().profile) return { entrar: [], continuam: [], novos: [] };
    return (await rpc<PracaSide | null>('praca_side')) ?? { entrar: [], continuam: [], novos: [] };
  },
  async vote(postId: string, option: number | null): Promise<Poll> {
    if (!supa()) return demo.vote(postId, option);
    return rpc<Poll>('poll_vote', { p_post: postId, p_option: option });
  },
  async save(postId: string, on: boolean): Promise<void> {
    if (!supa()) return demo.save(postId, on);
    await rpc('post_save', { p_post: postId, p_on: on });
  },
  async follow(postId: string, on: boolean): Promise<void> {
    if (!supa()) return demo.follow(postId, on);
    await rpc('post_follow', { p_post: postId, p_on: on });
  },
  /** Marca a conversa como lida e devolve a visita anterior (null = primeira vez). */
  async read(postId: string): Promise<string | null> {
    if (!supa()) return demo.read(postId);
    if (!getState().profile) return null;
    try { return await rpc<string | null>('post_read', { p_post: postId }); } catch { return null; }
  },
  async feed(): Promise<Post[]> {
    if (!supa()) return demo.feed();
    if (!getState().profile) return [];
    return (await rpc<Post[] | null>('communities_feed', { p_limit: 20 })) ?? [];
  },
  async forGame(gameIdOrSlug: string): Promise<Post[]> {
    if (!supa()) return demo.forGame(gameIdOrSlug);
    return (await rpc<Post[] | null>('game_posts', { p_game: gameIdOrSlug, p_limit: 10 })) ?? [];
  },
  async news(): Promise<ReplyNews> {
    if (!supa()) {
      const a = demo.news();
      const b = await (await import('./clubApi')).demoClubNews(demoSeenAt());
      const items = [...a.items, ...b.items].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 15);
      return { count: a.count + b.count, items };
    }
    if (!getState().profile) return { count: 0, items: [] };
    const sb = await client();
    const r = await sb.rpc('my_news');
    if (!r.error) return fixAuthors((r.data as ReplyNews | null) ?? { count: 0, items: [] });
    // Sem a 0028 ainda: só as respostas das comunidades (0026).
    const old = await sb.rpc('my_reply_news');
    if (old.error) return { count: 0, items: [] };
    const d = old.data as { count: number; items: { id: string; postId: string; slug: string; title: string; excerpt: string; at: string; author: PersonRef }[] } | null;
    return { count: d?.count ?? 0, items: (d?.items ?? []).map((x) => ({ kind: 'resposta', id: x.id, ref: x.postId, slug: x.slug, title: x.title, excerpt: x.excerpt, at: x.at, new: true, author: x.author })) };
  },
  async seen(): Promise<void> {
    if (!supa()) demo.seen();
    else await (await client()).rpc('replies_seen');
    news = { count: 0, items: news?.items ?? [] }; emitNews();
  },
  /** Tudo o que a pessoa escreveu na comunidade, para o "Baixar tudo". */
  async myData(): Promise<Record<string, unknown> | null> {
    if (!supa()) return demoMyData();
    if (!getState().profile) return null;
    return rpc<Record<string, unknown> | null>('my_community_data');
  },
  /** Envia uma imagem já reduzida e devolve o caminho (ou a própria imagem, na demonstração). */
  async uploadImage(blob: Blob, prefix = 'p'): Promise<string> {
    if (!supa()) return new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
    const uid = getState().profile?.id;
    if (!uid) throw new Error(MSG.not_logged);
    const path = `${uid}/${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${blob.type === 'image/jpeg' ? 'jpg' : 'webp'}`;
    const { error } = await (await client()).storage.from('comunidade').upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' });
    if (error) throw new Error(/bucket/i.test(error.message) ? 'Falta rodar a migração 0026 no Supabase.' : 'Não deu para enviar a imagem agora.');
    return path;
  },
  removeImages: (paths: string[]) => removeImages(paths),
};

async function removeImages(paths: string[]) {
  const mine = paths.filter((p) => !/^(data:|https?:|\/)/.test(p));
  if (!mine.length || !supa()) return;
  await (await client()).storage.from('comunidade').remove(mine).catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Demonstração                                                         */
/* ------------------------------------------------------------------ */
type DComm = { id: string; slug: string; name: string; description: string; rules: string; cover?: string | null; official: boolean; gameId?: string | null; game?: GameMini | null; createdAt: string; owner: string; hidden?: boolean; extra: number };
type DPoll = { options: string[]; counts: number[]; mine?: number | null };
type DPost = { id: string; cid: string | null; poll?: DPoll | null; author: string; kind: PostKind; title: string; body: string; gameId?: string | null; game?: GameMini | null; spoiler?: SpoilerLevel | null; spoilerNote?: string | null; images: string[]; clip?: string | null; pinned: boolean; answerId?: string | null; createdAt: string; editedAt?: string | null; deletedAt?: string | null; hidden?: boolean };
type DReply = { id: string; postId: string; parentId: string | null; author: string; body: string; createdAt: string; editedAt?: string | null; deletedAt?: string | null; hidden?: boolean };
type DReact = { mine: ReactionKind[] } & Partial<Record<ReactionKind, number>>;
type DB = { v: number; comms: DComm[]; posts: DPost[]; replies: DReply[]; reacts: Record<string, DReact>; mine: Record<string, 'dono' | 'membro'>; seenAt: string;
  saves: Record<string, string>; follows: string[]; reads: Record<string, string> };

const KEY = 'wz.demo.comunidades';
const VERSION = 3;
const ME = 'demo-me';
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const rid = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function seed(): DB {
  const c = (slug: string, name: string, description: string, owner: string, extra: number, more: Partial<DComm> = {}): DComm =>
    ({ id: `c-${slug}`, slug, name, description, rules: '', official: false, createdAt: ago(24 * 30), owner, extra, ...more });
  const comms: DComm[] = [
    c('winnerz', 'WinnerZ', 'A comunidade oficial do canal: avisos de vídeo e de live, novidades do site e o WinnerZ Awards.', ME, 41,
      { official: true, rules: 'Só o canal publica aqui; todo mundo pode responder. Valem as regras da comunidade do WinnerZ.', cover: '/demo/scene-astro-sky.webp' }),
    c('playstation', 'PlayStation', 'Do PS1 ao PS5: lançamentos, memórias e o que cada um está jogando.', 'demo-duda', 18, { cover: '/demo/scene-tlou-field.webp' }),
    c('elden-ring', 'Elden Ring', 'Builds, chefes, caminhos e a dor de cada um nas Terras Intermédias.', 'demo-carol', 9, { gameId: 'elden', rules: 'Spoiler do final só marcado como "Do final".' }),
    c('retro', 'Retrô', 'Jogos de até 2005, emuladores, consoles antigos e a nostalgia de sempre.', 'demo-rafa', 12, { cover: '/demo/scene-dderby.webp' }),
    c('backlog-sem-culpa', 'Backlog sem culpa', 'Para quem tem mais jogo do que tempo, e tudo bem.', 'demo-duda', 7),
    c('colecao-fisica', 'Coleção física', 'Prateleiras, edições de colecionador, achados de sebo e caixinhas.', 'demo-carol', 10, { cover: '/demo/scene-yakuza-street.webp' }),
  ];
  const p = (id: string, cid: string, author: string, h: number, kind: PostKind, title: string, body: string, more: Partial<DPost> = {}): DPost =>
    ({ id, cid: `c-${cid}`, author, kind, title, body, images: [], pinned: false, createdAt: ago(h), ...more });
  const posts: DPost[] = [
    p('p-boasvindas', 'winnerz', ME, 24 * 20, 'discussao', 'Boas-vindas à comunidade oficial',
      'Aqui saem os avisos de vídeo e de live, as novidades do site e, em dezembro, o **WinnerZ Awards**.\n\nConta aqui embaixo: o que você está jogando agora?', { pinned: true }),
    p('p-live', 'winnerz', ME, 30, 'dica', 'Live de sexta: Astro Bot até o fim', 'Sexta, 21h, na Twitch. Vou tentar fechar o último planeta e pegar todos os bots.\n\nVai ter código de figurinha durante a live.', { gameId: 'astro' }),
    p('p-ps1', 'playstation', 'demo-duda', 50, 'discussao', 'Qual foi o primeiro jogo de vocês no PS1?', 'O meu foi Destruction Derby, alugado na locadora do bairro. Passei o fim de semana inteiro batendo carro no estádio.', { gameId: 'dderby' }),
    p('p-astro', 'playstation', ME, 20, 'pergunta', 'Astro Bot é o melhor jogo do PS5 até agora?', 'Estou com 30% e já acho que sim. Quem zerou: o final segura?', { gameId: 'astro' }),
    p('p-malenia', 'elden-ring', 'demo-carol', 70, 'pergunta', 'Malenia: vale usar invocação?', 'Tentei umas 40 vezes sozinha. A Tiche ajuda ou tira a graça?', { gameId: 'elden', spoiler: 'final', spoilerNote: 'Uma chefe opcional do fim do jogo' }),
    p('p-farum', 'elden-ring', 'demo-duda', 120, 'discussao', 'A virada depois da capital', 'Quando ||a Árvore pega fogo|| eu fiquei uns cinco minutos parada olhando a tela. @carol, você sentiu o mesmo?', { gameId: 'elden', spoiler: 'meio', spoilerNote: 'O que acontece depois da capital' }),
    p('p-derby', 'retro', 'demo-rafa', 36, 'dica', 'Destruction Derby: freio de mão no estádio', 'No modo estádio, puxe o freio de mão antes da batida: o carro gira e acerta de lado, que dá mais ponto e estraga menos o seu.', { gameId: 'dderby' }),
    p('p-nfs', 'retro', 'demo-rafa', 200, 'colecao', 'Need for Speed de 1994, na caixa', 'Achei num sebo por 30 reais, com manual e tudo.', { gameId: 'nfs', images: ['/demo/cover-nfs.webp', '/demo/scene-nfs.webp'] }),
    p('p-backlog', 'backlog-sem-culpa', 'demo-duda', 90, 'discussao', 'Quantos jogos tem no backlog e quantos zerou este ano?', 'Eu: 37 no backlog, 9 zerados. Zero culpa.'),
    p('p-prateleira', 'colecao-fisica', 'demo-carol', 140, 'colecao', 'A prateleira dos RPGs', 'Arrumei por ordem de lançamento. Persona fica no meio, de capa para a frente.', { gameId: 'p5r', images: ['/demo/cover-p5r.webp', '/demo/cover-yakuza.webp', '/demo/scene-yakuza-street.webp'] }),
  ];
  const r = (id: string, postId: string, author: string, h: number, body: string, parentId: string | null = null): DReply => ({ id, postId, parentId, author, body, createdAt: ago(h) });
  const replies: DReply[] = [
    r('r1', 'p-boasvindas', 'demo-duda', 24 * 19, 'Astro Bot! Tô no último planeta.'),
    r('r2', 'p-boasvindas', 'demo-rafa', 24 * 18, 'Destruction Derby de novo, no emulador.'),
    r('r3', 'p-ps1', 'demo-carol', 48, 'Crash Bandicoot, com o controle sem analógico.'),
    r('r4', 'p-ps1', 'demo-rafa', 46, 'Need for Speed. Até hoje sei a pista de cor.'),
    r('r5', 'p-ps1', 'demo-duda', 45, 'Rafa, a de montanha?', 'r4'),
    r('r6', 'p-astro', 'demo-duda', 6, 'Segura! O último planeta é uma festa.'),
    r('r7', 'p-astro', 'demo-carol', 3, 'Para mim perde só para Elden Ring, mas é outro tipo de jogo.'),
    r('r7b', 'p-astro', 'demo-rafa', 2, '> @carol: Para mim perde só para Elden Ring\n\nConcordo, @voce. São jogos de humor diferente.'),
    r('r8', 'p-malenia', 'demo-duda', 60, 'Usa a Tiche sem culpa. A segunda fase continua difícil do mesmo jeito.'),
    r('r9', 'p-malenia', 'demo-rafa', 58, 'Eu fui no braço, 70 tentativas. Valeu cada uma.'),
    r('r10', 'p-derby', 'demo-duda', 30, 'Isso salvou a minha infância.'),
    r('r11', 'p-yakuza', 'demo-duda', 20, 'Yakuza 0, sem dúvida. Você entende tudo o que vem depois.'),
    r('r12', 'p-yakuza', 'demo-rafa', 8, 'Comecei pelo Like a Dragon e não me arrependo.'),
    r('r13', 'p-yakuza', 'demo-carol', 1, 'Vou de 0 então. Valeu, gente!'),
    r('r14', 'p-backlog', 'demo-carol', 5, 'Voltei para dizer: zerei mais 2 este mês!'),
  ];
  // Direto na Praça (sem comunidade).
  posts.push(
    { id: 'p-yakuza', cid: null, author: 'demo-carol', kind: 'enquete', title: '', body: 'Qual Yakuza para começar a série?', images: [], pinned: false, createdAt: ago(26),
      gameId: 'yakuza', poll: { options: ['Yakuza 0', 'Yakuza Kiwami', 'Like a Dragon'], counts: [28, 13, 7], mine: null } },
    { id: 'p-astro-semana', cid: null, author: 'demo-duda', kind: 'discussao', title: '', body: 'Alguém mais jogando Astro Bot esta semana? Fechei o planeta de gelo ontem. @voce, já chegou lá?', images: [], pinned: false, createdAt: ago(5), gameId: 'astro' },
    { id: 'p-mgs-caixa', cid: null, author: 'demo-rafa', kind: 'aquisicao', title: 'Metal Gear Solid 2, completo', body: 'Veio de uma feira de troca: caixa, manual e o disco sem um risco. Agora sim a prateleira do PS2 fecha.', images: ['/demo/cover-mgs2.webp'], pinned: false, createdAt: ago(30), gameId: 'mgs2' },
    { id: 'p-lu', cid: null, author: 'demo-lu', kind: 'pergunta', title: 'Comecei Persona 5 agora. Alguma dica sem spoiler?', body: 'Primeira vez num jogo da série. Não sei se faço tudo no primeiro dia ou deixo para depois.', images: [], pinned: false, createdAt: ago(1), gameId: 'p5r' },
  );
  const reacts: Record<string, DReact> = {
    'post:p-boasvindas': { gg: 12, coracao: 20, junto: 4, mine: [] }, 'post:p-live': { gg: 8, coracao: 5, jogar: 6, mine: [] },
    'post:p-ps1': { gg: 4, coracao: 9, momento: 3, haha: 2, mine: [] }, 'post:p-astro': { gg: 2, coracao: 1, jogar: 3, mine: [] },
    'post:p-malenia': { gg: 6, coracao: 2, junto: 5, mine: [] }, 'post:p-farum': { gg: 3, coracao: 4, momento: 7, mine: [] },
    'post:p-derby': { gg: 7, coracao: 1, dica: 9, mine: [] }, 'post:p-nfs': { gg: 2, coracao: 11, jogar: 2, mine: [] },
    'post:p-prateleira': { gg: 1, coracao: 14, mine: [] }, 'post:p-yakuza': { dica: 5, mine: [] }, 'post:p-mgs-caixa': { coracao: 11, jogar: 3, mine: [] },
    'post:p-astro-semana': { gg: 3, junto: 2, mine: [] }, 'resposta:r8': { gg: 5, dica: 4, mine: [] }, 'resposta:r9': { haha: 2, junto: 3, mine: [] },
  };
  const db: DB = { v: VERSION, comms, posts, replies, reacts, mine: { 'c-winnerz': 'dono', 'c-playstation': 'membro', 'c-retro': 'membro' }, seenAt: ago(12),
    saves: { 'p-malenia': ago(40) }, follows: ['p-astro', 'p-boasvindas', 'p-live', 'p-yakuza', 'p-backlog'], reads: { 'p-yakuza': ago(10), 'p-backlog': ago(30) } };
  db.posts.find((x) => x.id === 'p-malenia')!.answerId = 'r8';
  return db;
}
function loadDb(): DB {
  try { const x = JSON.parse(localStorage.getItem(KEY) || 'null') as DB | null; if (x && x.v === VERSION) return x; } catch { /* começa de novo */ }
  const s = seed(); saveDb(s); return s;
}
function saveDb(db: DB) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { throw new Error('O navegador ficou sem espaço para a demonstração. Use imagens menores ou recomece a demonstração.'); } }

function myHandle(): string { try { return (JSON.parse(localStorage.getItem('wz.profile.demo.v1') || '{}') as { handle?: string }).handle || 'voce'; } catch { return 'voce'; } }
/** Gente que só aparece na comunidade da demonstração (chegou agora e topou aparecer em "Novos por aqui"). */
const NEWCOMERS: Record<string, { handle: string; since: string }> = { 'demo-lu': { handle: 'lu', since: ago(24 * 3) } };
function person(id: string): PersonRef {
  if (id === ME) return { id, handle: myHandle(), avatar: null, admin: true };
  if (NEWCOMERS[id]) return { id, handle: NEWCOMERS[id].handle, avatar: null, admin: false, novo: true };
  const p = DEMO_PEOPLE.find((x) => x.id === id);
  return { id, handle: p?.handle ?? null, avatar: null, admin: false };
}
const isFriend = (id: string) => { const p = DEMO_PEOPLE.find((x) => x.id === id); return !!p && demoIsFriend(p); };
const iFollow = (id: string) => { const p = DEMO_PEOPLE.find((x) => x.id === id); return !!p && demoFollowing().includes(p.handle); };
/** "Jogando" ou "zerou" o jogo da conversa, para as pessoas de exemplo (na demonstração todas deixam ver). */
function ctxOf(author: string, gameId?: string | null): string | null {
  if (!gameId) return null;
  const p = DEMO_PEOPLE.find((x) => x.id === author);
  if (!p) return null;
  return p.done.includes(gameId) ? 'zerou' : p.playing.includes(gameId) ? 'jogando' : null;
}
function muted(): Set<string> {
  try { return new Set((JSON.parse(localStorage.getItem('wz.demo.blocks') || '[]') as { handle?: string }[]).map((b) => (b.handle ?? '').toLowerCase())); } catch { return new Set(); }
}
const visible = (author: string) => author === ME || !muted().has((person(author).handle ?? '').toLowerCase());
/** Jogo da demonstração: os de exemplo, os do seu acervo ou o que ficou guardado junto da postagem. */
function gameMini(id?: string | null, snap?: GameMini | null): GameMini | null {
  if (!id) return null;
  const g = demoGames.find((x) => x.id === id) ?? getState().games[id];
  return g ? { id: g.id, slug: g.slug, title: g.title, cover: g.cover } : snap ?? null;
}
const snapGame = (id?: string | null) => gameMini(id);
const reactOf = (db: DB, k: string): Reactions => {
  const r = db.reacts[k] ?? { mine: [] };
  const out: Reactions = { mine: r.mine };
  for (const x of REACTION_KINDS) out[x] = (r[x] ?? 0) + (r.mine.includes(x) ? 1 : 0);
  return out;
};
const liveReplies = (db: DB, postId: string) => db.replies.filter((r) => r.postId === postId && !r.deletedAt && visible(r.author));

function commOut(db: DB, c: DComm): Community {
  const posts = db.posts.filter((p) => p.cid === c.id && !p.deletedAt);
  return {
    id: c.id, slug: c.slug, name: c.name, description: c.description, rules: c.rules, cover: c.cover ?? null, official: c.official,
    game: gameMini(c.gameId, c.game), createdAt: c.createdAt, hidden: !!c.hidden, owner: person(c.owner),
    members: c.extra + (db.mine[c.id] ? 1 : 0), posts: posts.length,
    lastAt: posts.map((p) => p.createdAt).sort().pop() ?? null, role: db.mine[c.id] ?? null,
  };
}
function pollOut(p: DPoll): Poll {
  const counts = p.counts.map((n, i) => n + (p.mine === i ? 1 : 0));
  return { options: p.options.map((text, i) => ({ text, votes: counts[i] })), total: counts.reduce((a, b) => a + b, 0), mine: p.mine ?? null };
}
function postOut(db: DB, p: DPost, full: boolean, why?: string | null): Post {
  const c = p.cid ? db.comms.find((x) => x.id === p.cid) ?? null : null;
  const rs = liveReplies(db, p.id);
  const readAt = db.reads[p.id] ?? null;
  return {
    id: p.id, kind: p.kind, title: p.title || null, body: full ? p.body : p.body.slice(0, 280), game: gameMini(p.gameId, p.game), spoiler: p.spoiler ?? null, spoilerNote: p.spoilerNote ?? null,
    images: full ? p.images : p.images.slice(0, 1), imageCount: p.images.length, clip: p.clip ?? null, pinned: p.pinned, answerId: p.answerId ?? null,
    createdAt: p.createdAt, editedAt: p.editedAt ?? null, hidden: !!p.hidden, author: person(p.author), authorCtx: ctxOf(p.author, p.gameId),
    community: c ? { slug: c.slug, name: c.name, official: c.official } : null, replies: rs.length,
    lastReplyAt: rs.map((r) => r.createdAt).sort().pop() ?? null, reactions: reactOf(db, `post:${p.id}`),
    poll: p.kind === 'enquete' && p.poll ? pollOut(p.poll) : null, saved: !!db.saves[p.id], following: db.follows.includes(p.id),
    readAt, unread: readAt ? rs.filter((r) => r.author !== ME && r.createdAt > readAt).length : 0, why: why ?? null,
  };
}
const livePosts = (db: DB) => db.posts.filter((p) => !p.deletedAt && visible(p.author));
function err(code: string): never { throw new Error(MSG[code] ?? code); }
function checkDraft(d: PostDraft) {
  const t = d.title.trim();
  if (t && (t.length < 3 || t.length > 140)) err('title_invalid');
  if (!t && !d.body.trim() && !d.images.length && !d.clip) err('post_empty');
  if (d.kind === 'enquete') {
    const o = (d.poll ?? []).map((x) => x.trim()).filter(Boolean);
    if (o.length < 2 || o.length > 6 || o.some((x) => x.length > 80)) err('poll_invalid');
    if (!t && !d.body.trim()) err('poll_question');
  }
  if (d.kind === 'aquisicao' && !d.gameId) err('game_needed');
  if (d.body.length > 10000) err('body_long');
  if (d.images.length > MAX_IMAGES) err('image_limit');
  if (d.clip && !clipOk(d.clip)) err('clip_invalid');
  if (d.kind === 'clipe' && !d.clip) err('clip_needed');
}

const demo = {
  list(q: string): Community[] {
    const db = loadDb(); const n = q.trim().toLowerCase();
    return db.comms.filter((c) => !c.hidden && (!n || `${c.name} ${c.description} ${c.slug}`.toLowerCase().includes(n)))
      .map((c) => commOut(db, c)).sort((a, b) => Number(b.official) - Number(a.official) || b.members - a.members);
  },
  mine(): Community[] { const db = loadDb(); return db.comms.filter((c) => db.mine[c.id]).map((c) => commOut(db, c)); },
  get(slug: string): Community | null { const db = loadDb(); const c = db.comms.find((x) => x.slug === slug.toLowerCase()); return c ? commOut(db, c) : null; },
  page(slug: string, sort: 'recentes' | 'conversadas', before?: string): CommunityPage | null {
    const db = loadDb(); const c = db.comms.find((x) => x.slug === slug.toLowerCase());
    if (!c) return null;
    const all = livePosts(db).filter((p) => p.cid === c.id);
    const week = Date.now() - 7 * 86_400_000;
    const recent = (p: DPost) => liveReplies(db, p.id).filter((r) => Date.parse(r.createdAt) > week).length;
    let list = all.filter((p) => !p.pinned);
    if (sort === 'conversadas') list = list.filter((p) => recent(p) > 0).sort((a, b) => recent(b) - recent(a) || b.createdAt.localeCompare(a.createdAt));
    else list = list.filter((p) => !before || p.createdAt < before).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
    return { community: commOut(db, c), pinned: all.filter((p) => p.pinned).map((p) => postOut(db, p, false)), posts: list.map((p) => postOut(db, p, false)) };
  },
  create(d: CommunityDraft): Community {
    const db = loadDb();
    if (!slugOk(d.slug)) err('slug_invalid');
    if (['nova', 'criar', 'editar', 'escrever', 'comunidades', 'admin', 'winnerz'].includes(d.slug)) err('slug_reserved');
    if (db.comms.some((c) => c.slug === d.slug)) err('slug_taken');
    if (d.name.trim().length < 3 || d.name.trim().length > 48) err('name_invalid');
    const c: DComm = { id: `c-${d.slug}`, slug: d.slug, name: d.name.trim(), description: d.description.trim().slice(0, 300), rules: d.rules.trim().slice(0, 1000), gameId: d.gameId, game: snapGame(d.gameId), official: false, createdAt: new Date().toISOString(), owner: ME, extra: 0 };
    db.comms.push(c); db.mine[c.id] = 'dono'; saveDb(db);
    return commOut(db, c);
  },
  update(id: string, d: CommunityDraft): Community {
    const db = loadDb(); const c = db.comms.find((x) => x.id === id);
    if (!c) err('target_not_found');
    if (c.owner !== ME) err('not_owner');
    if (d.name.trim().length < 3 || d.name.trim().length > 48) err('name_invalid');
    Object.assign(c, { name: d.name.trim(), description: d.description.trim().slice(0, 300), rules: d.rules.trim().slice(0, 1000), gameId: d.gameId, game: snapGame(d.gameId), cover: d.cover ?? null });
    saveDb(db); return commOut(db, c);
  },
  setOfficial(id: string, on: boolean) { const db = loadDb(); const c = db.comms.find((x) => x.id === id); if (c) { c.official = on; saveDb(db); } },
  join(id: string, on: boolean): Community {
    const db = loadDb(); const c = db.comms.find((x) => x.id === id);
    if (!c) err('target_not_found');
    if (on) db.mine[id] = db.mine[id] ?? 'membro';
    else { if (db.mine[id] === 'dono') err('owner_leave'); delete db.mine[id]; }
    saveDb(db); return commOut(db, c);
  },
  post(id: string): PostFull | null {
    const db = loadDb(); const p = db.posts.find((x) => x.id === id && !x.deletedAt);
    if (!p || !visible(p.author)) return null;
    const c = p.cid ? db.comms.find((x) => x.id === p.cid) ?? null : null;
    const thread = db.replies.filter((r) => r.postId === id && visible(r.author) && (!r.deletedAt || db.replies.some((k) => k.parentId === r.id && !k.deletedAt)))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r): Reply => ({ id: r.id, parentId: r.parentId, body: r.deletedAt ? '' : r.body, deleted: !!r.deletedAt, createdAt: r.createdAt, editedAt: r.editedAt ?? null, hidden: !!r.hidden, author: person(r.author), authorCtx: ctxOf(r.author, p.gameId), reactions: reactOf(db, `resposta:${r.id}`) }));
    return { ...postOut(db, p, true), communityFull: c ? commOut(db, c) : null, canModerate: c ? c.owner === ME : true, thread };
  },
  createPost(cid: string | null, d: PostDraft): Post {
    const db = loadDb(); const c = cid ? db.comms.find((x) => x.id === cid) : null;
    if (cid && !c) err('target_not_found');
    checkDraft(d);
    const poll = d.kind === 'enquete' ? (d.poll ?? []).map((x) => x.trim()).filter(Boolean) : null;
    const p: DPost = { id: rid(), cid, author: ME, kind: d.kind, title: d.title.trim(), body: d.body, gameId: d.gameId, game: snapGame(d.gameId), spoiler: d.gameId ? d.spoiler : null, spoilerNote: d.gameId && d.spoiler ? d.spoilerNote?.trim().slice(0, 80) || null : null, images: d.images, clip: d.clip, pinned: false, createdAt: new Date().toISOString(),
      poll: poll ? { options: poll, counts: poll.map(() => 0), mine: null } : null };
    db.posts.push(p); db.follows = [...new Set([...db.follows, p.id])]; saveDb(db);
    return postOut(db, p, true);
  },
  editPost(id: string, d: PostDraft): Post {
    const db = loadDb(); const p = db.posts.find((x) => x.id === id);
    if (!p || p.author !== ME) err('not_author');
    checkDraft(d);
    if (p.poll && d.poll && !p.poll.counts.some((n) => n > 0) && p.poll.mine == null) { const o = d.poll.map((x) => x.trim()).filter(Boolean); p.poll = { options: o, counts: o.map(() => 0), mine: null }; }
    Object.assign(p, { kind: d.kind, title: d.title.trim(), body: d.body, gameId: d.gameId, game: snapGame(d.gameId), spoiler: d.gameId ? d.spoiler : null, spoilerNote: d.gameId && d.spoiler ? d.spoilerNote?.trim().slice(0, 80) || null : null, images: d.images, clip: d.clip, editedAt: new Date().toISOString() });
    saveDb(db); return postOut(db, p, true);
  },
  deletePost(id: string) {
    const db = loadDb(); const p = db.posts.find((x) => x.id === id);
    if (!p || p.author !== ME) err('not_author');
    p.deletedAt = new Date().toISOString(); p.images = []; p.pinned = false; saveDb(db);
  },
  pin(id: string, on: boolean) {
    const db = loadDb(); const p = db.posts.find((x) => x.id === id);
    if (!p) err('target_not_found');
    if (on && db.posts.filter((x) => x.cid === p.cid && x.pinned).length >= 3) err('pin_limit');
    p.pinned = on; saveDb(db);
  },
  answer(postId: string, replyId: string | null) { const db = loadDb(); const p = db.posts.find((x) => x.id === postId); if (p) { p.answerId = replyId; saveDb(db); } },
  reply(postId: string, parentId: string | null, body: string): Reply {
    const db = loadDb(); const t = body.trim();
    if (!t || t.length > 5000) err('body_invalid');
    const parent = parentId ? db.replies.find((r) => r.id === parentId) : null;
    const r: DReply = { id: rid(), postId, parentId: parent ? parent.parentId ?? parent.id : null, author: ME, body: t, createdAt: new Date().toISOString() };
    db.replies.push(r); db.follows = [...new Set([...db.follows, postId])]; db.reads[postId] = r.createdAt; saveDb(db);
    return { id: r.id, parentId: r.parentId, body: r.body, deleted: false, createdAt: r.createdAt, editedAt: null, hidden: false, author: person(ME), reactions: { mine: [] } };
  },
  editReply(id: string, body: string) { const db = loadDb(); const r = db.replies.find((x) => x.id === id && x.author === ME); if (!r) err('not_author'); if (!body.trim()) err('body_invalid'); r.body = body.trim(); r.editedAt = new Date().toISOString(); saveDb(db); },
  deleteReply(id: string) {
    const db = loadDb(); const r = db.replies.find((x) => x.id === id && x.author === ME); if (!r) err('not_author');
    r.deletedAt = new Date().toISOString(); db.posts.forEach((p) => { if (p.answerId === id) p.answerId = null; }); saveDb(db);
  },
  react(target: 'post' | 'resposta', id: string, kind: ReactionKind, on: boolean): Reactions {
    const db = loadDb(); const k = `${target}:${id}`;
    const r = db.reacts[k] ?? { mine: [] };
    r.mine = on ? [...new Set([...r.mine, kind])] : r.mine.filter((x) => x !== kind);
    db.reacts[k] = r; saveDb(db); return reactOf(db, k);
  },
  praca(path: PracaPath, before?: string): Post[] {
    const db = loadDb();
    const all = livePosts(db).filter((p) => !before || p.createdAt < before);
    const week = Date.now() - 7 * 86_400_000;
    const weekN = (p: DPost) => liveReplies(db, p.id).filter((r) => Date.parse(r.createdAt) > week).length;
    const s = getState();
    const comm = (p: DPost) => (p.cid ? db.comms.find((c) => c.id === p.cid) ?? null : null);
    const why = (p: DPost): string | null => {
      const h = person(p.author).handle;
      const g = gameMini(p.gameId, p.game);
      if (isFriend(p.author)) return `Porque você e @${h} se seguem`;
      if (p.gameId && s.journeys.some((j) => j.gameId === p.gameId)) return `Porque ${g?.title} está na sua Jornada`;
      if (p.gameId && s.copies.some((c) => c.gameId === p.gameId)) return `Porque ${g?.title} está na sua Coleção`;
      if (p.gameId && s.wishes.some((w) => w.gameId === p.gameId)) return `Porque ${g?.title} está nos seus desejos`;
      if (p.cid && db.mine[p.cid]) return `Você segue w/${comm(p)?.slug}`;
      if (iFollow(p.author)) return `Você segue @${h}`;
      if (weekN(p) >= 3) return 'Uma das mais conversadas da semana';
      if (!p.cid && Date.parse(p.createdAt) > Date.now() - 3 * 86_400_000) return 'Novo na Praça';
      if (comm(p)?.official) return 'Da comunidade oficial do canal';
      return p.cid ? `Em w/${comm(p)?.slug}, que você ainda não segue` : 'Na Praça, de quem você ainda não segue';
    };
    const byNew = (a: DPost, b: DPost) => b.createdAt.localeCompare(a.createdAt);
    if (path === 'salvos') return Object.entries(db.saves).sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => db.posts.find((p) => p.id === id && !p.deletedAt)).filter((p): p is DPost => !!p).map((p) => postOut(db, p, false));
    if (path === 'discussoes') {
      return livePosts(db).map((p) => ({ p, n: weekN(p) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
        .map(({ p, n }) => postOut(db, p, false, `${Date.parse(p.createdAt) < week ? 'Conversa que voltou: ' : ''}${n === 1 ? '1 resposta' : `${n} respostas`} esta semana`));
    }
    if (path === 'amigos') return all.filter((p) => isFriend(p.author)).sort(byNew).map((p) => postOut(db, p, false, `De @${person(p.author).handle}`));
    if (path === 'seguindo') return all.filter((p) => p.author === ME || iFollow(p.author) || (p.cid && db.mine[p.cid])).sort(byNew).map((p) => postOut(db, p, false, why(p)));
    if (path === 'novos') return all.filter((p) => !!NEWCOMERS[p.author]).sort(byNew).map((p) => postOut(db, p, false, 'Chegou esta semana'));
    return all.filter((p) => p.author !== ME).map((p) => ({ p, w: why(p) })).filter((x) => x.w).sort((a, b) => byNew(a.p, b.p)).slice(0, 30).map(({ p, w }) => postOut(db, p, false, w));
  },
  side(): PracaSide {
    const db = loadDb();
    const n = (p: DPost) => liveReplies(db, p.id).length;
    const recent = livePosts(db).filter((p) => p.author !== ME && p.kind !== 'aquisicao' && Date.parse(p.createdAt) > Date.now() - 4 * 86_400_000 && n(p) <= 2);
    const entrar = recent.sort((a, b) => Number(b.kind === 'pergunta') - Number(a.kind === 'pergunta') || Number(!!NEWCOMERS[b.author]) - Number(!!NEWCOMERS[a.author]) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
      .map((p) => postOut(db, p, false, n(p) === 0 ? 'Ninguém respondeu ainda' : n(p) === 1 ? 'Só 1 resposta até agora' : `${n(p)} respostas até agora`));
    const continuam = livePosts(db).filter((p) => Date.parse(p.createdAt) < Date.now() - 7 * 86_400_000 && liveReplies(db, p.id).some((r) => Date.parse(r.createdAt) > Date.now() - 3 * 86_400_000)).slice(0, 3)
      .map((p) => postOut(db, p, false, `Começou ${new Date(p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })} e voltou a render`));
    const novos = Object.entries(NEWCOMERS).map(([id, x]) => { const last = livePosts(db).filter((p) => p.author === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; return { ...person(id), since: x.since, post: last ? { id: last.id, title: last.title || last.body.slice(0, 80) } : null }; });
    return { entrar, continuam, novos };
  },
  vote(postId: string, option: number | null): Poll {
    const db = loadDb(); const p = db.posts.find((x) => x.id === postId);
    if (!p?.poll) err('target_not_found');
    if (option != null && (option < 0 || option >= p!.poll!.options.length)) err('poll_invalid');
    p!.poll!.mine = option; saveDb(db); return pollOut(p!.poll!);
  },
  save(postId: string, on: boolean) { const db = loadDb(); if (on) db.saves[postId] = new Date().toISOString(); else delete db.saves[postId]; saveDb(db); },
  follow(postId: string, on: boolean) { const db = loadDb(); db.follows = on ? [...new Set([...db.follows, postId])] : db.follows.filter((x) => x !== postId); saveDb(db); },
  read(postId: string): string | null { const db = loadDb(); const before = db.reads[postId] ?? null; db.reads[postId] = new Date().toISOString(); saveDb(db); return before; },
  feed(): Post[] {
    const db = loadDb();
    const at = (p: DPost) => [p.createdAt, ...liveReplies(db, p.id).map((r) => r.createdAt)].sort().pop()!;
    return livePosts(db).filter((p) => p.cid && db.mine[p.cid]).sort((a, b) => at(b).localeCompare(at(a))).slice(0, 20).map((p) => postOut(db, p, false));
  },
  forGame(g: string): Post[] {
    const db = loadDb();
    return livePosts(db).filter((p) => p.gameId === g || gameMini(p.gameId, p.game)?.slug === g).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10).map((p) => postOut(db, p, false));
  },
  news(): ReplyNews {
    const db = loadDb();
    const pref = (k: keyof CommunityPrefs, d = true) => getState().prefs.comunidade?.[k] ?? d;
    const label = (p: DPost) => p.title || postTitle({ title: null, body: p.body, kind: p.kind });
    const slugOf = (p: DPost) => (p.cid ? db.comms.find((x) => x.id === p.cid)?.slug ?? '' : '');
    const out: NewsItem[] = [];
    const seen = new Set<string>();
    const add = (n: NewsItem) => { if (!seen.has(n.id)) { seen.add(n.id); out.push(n); } };
    const me = myHandle().toLowerCase();
    const mentions = (body: string) => mentionsOf(body).some((h) => h.toLowerCase() === me);
    for (const p of livePosts(db)) {
      for (const r of liveReplies(db, p.id)) {
        if (r.author === ME || r.createdAt <= db.seenAt) continue;
        const parent = r.parentId ? db.replies.find((x) => x.id === r.parentId) : null;
        const base = { id: r.id, ref: p.id, slug: slugOf(p), title: label(p), excerpt: r.body.slice(0, 140), at: r.createdAt, new: true, author: person(r.author) };
        if (pref('aviso_respostas') && ((p.author === ME && db.follows.includes(p.id)) || parent?.author === ME)) add({ kind: 'resposta', ...base });
        else if (pref('aviso_mencoes') && mentions(r.body)) add({ kind: 'mencao', ...base });
        else if (pref('aviso_acompanhando') && p.author !== ME && db.follows.includes(p.id)) add({ kind: 'acompanhando', ...base });
      }
      if (pref('aviso_mencoes') && p.author !== ME && p.createdAt > db.seenAt && mentions(p.body)) add({ kind: 'mencao', id: p.id, ref: p.id, slug: slugOf(p), title: label(p), excerpt: p.body.slice(0, 140), at: p.createdAt, new: true, author: person(p.author) });
    }
    out.sort((a, b) => b.at.localeCompare(a.at));
    return { count: out.length, items: out.slice(0, 15) };
  },
  seen() { const db = loadDb(); db.seenAt = new Date().toISOString(); saveDb(db); },
};

/** Desde quando os avisos da demonstração já foram vistos (o mesmo marcador para comunidades e clubes). */
export function demoSeenAt(): string { return loadDb().seenAt; }
/** Pessoa de exemplo (ou você) no formato das listas; usado também pelos clubes da demonstração. */
export const demoPersonRef = (id: string): PersonRef => person(id);
export const demoGameMini = (id?: string | null): GameMini | null => gameMini(id);
export const demoReactions = (target: 'post' | 'resposta', id: string): Reactions => reactOf(loadDb(), `${target}:${id}`);

/** "Baixar tudo" na demonstração: o que você escreveu nas comunidades e nos clubes deste navegador. */
async function demoMyData(): Promise<Record<string, unknown>> {
  const db = loadDb();
  const where = (cid: string | null) => (cid ? `w/${db.comms.find((c) => c.id === cid)?.slug ?? ''}` : 'Praça');
  const clubs = await (await import('./clubApi')).demoClubData();
  return {
    postagens: db.posts.filter((p) => p.author === ME).map((p) => ({ id: p.id, onde: where(p.cid), tipo: p.kind, titulo: p.title, texto: p.body, jogo: gameMini(p.gameId, p.game)?.title ?? null, spoiler: p.spoiler ?? null, spoilerSobre: p.spoilerNote ?? null, imagens: p.images, link: p.clip ?? null, criadaEm: p.createdAt, editadaEm: p.editedAt ?? null, apagadaEm: p.deletedAt ?? null })),
    respostas: db.replies.filter((r) => r.author === ME).map((r) => { const p = db.posts.find((x) => x.id === r.postId); return { id: r.id, postagem: r.postId, onde: p ? where(p.cid) : '', emResposta: p?.title ?? '', texto: r.body, criadaEm: r.createdAt, editadaEm: r.editedAt ?? null, apagadaEm: r.deletedAt ?? null }; }),
    comunidadesCriadas: db.comms.filter((c) => c.owner === ME).map((c) => ({ endereco: `w/${c.slug}`, nome: c.name, descricao: c.description, combinados: c.rules, criadaEm: c.createdAt })),
    comunidadesQueSegue: db.comms.filter((c) => db.mine[c.id]).map((c) => ({ endereco: `w/${c.slug}`, nome: c.name })),
    ...clubs,
    reacoes: Object.entries(db.reacts).flatMap(([k, v]) => v.mine.map((kind) => ({ em: k.split(':')[0], id: k.split(':')[1], reacao: kind }))),
  };
}
