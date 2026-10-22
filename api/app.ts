/**
 * Widgets do app WinnerZ (Android, migração 0090): o painel que os widgets mostram e as ações que eles fazem
 * sem abrir o site (a sessão inteira da Jornada, responder à jogatina, marcar avisos como lidos).
 *
 *   POST /api/app   cabeçalho x-winnerz-chave: <chave do app>   { acao: 'painel' | 'jogar' | 'intencao' | 'objetivo'
 *                    | 'momento' | 'finalizar' | 'rsvp' | 'lidos' | 'esquecer', ... }
 *
 * A chave do app vem de app_parear (o site pede, com o login, e entrega ao Android). O banco só guarda o resumo dela.
 * As regras ficam no banco (app_painel e app_acao); aqui só repassamos, enviamos a foto do momento para o Storage
 * e escrevemos o texto dos avisos. Chave que não vale mais devolve 401, e o app esquece a chave.
 *
 * Variáveis na Vercel: SUPABASE_URL + SUPABASE_SECRET_KEY (já usadas); TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET
 * (já usadas pelo IGDB) para saber se a live está no ar.
 */
import { randomUUID } from 'node:crypto';

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };
type AvisoTexto = { kind: string; title: string | null; excerpt: string | null; data: Record<string, unknown> | null };
type Item = AvisoTexto & { id: string; link: string | null; at: string; read: boolean; actorCount?: number; actors?: { handle?: string | null }[] };

const BUCKET = 'momentos';
const ACOES = new Set(['jogar', 'intencao', 'objetivo', 'finalizar', 'rsvp', 'lidos']);
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } as Record<string, string> };
}

class Recusa extends Error { constructor(public codigo: number, msg: string) { super(msg); } }

async function rpc<T>(c: { url: string; headers: Record<string, string> }, fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: c.headers, body: JSON.stringify(args) });
  const j = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = (j as { message?: string } | null)?.message ?? 'erro';
    if (msg.includes('chave_invalida')) throw new Recusa(401, 'chave_invalida');
    throw new Recusa(400, msg);
  }
  return j as T;
}

const quando = (iso: unknown) => {
  if (typeof iso !== 'string' || !iso) return '';
  try { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch { return ''; }
};
const hora = (iso: unknown) => {
  if (typeof iso !== 'string' || !iso) return '';
  try { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch { return ''; }
};
const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** O texto da notificação, como a frase da Central de Avisos (src/components/Notifications.tsx). */
function texto(n: AvisoTexto, quem: string): { titulo: string; corpo: string } {
  const t = n.title ?? '', ex = n.excerpt ? `“${corta(n.excerpt, 120)}”` : '', d = n.data ?? {};
  const com = (a: string, b: string) => [a, b].filter(Boolean).join(': ');
  switch (n.kind) {
    case 'resposta': return { titulo: `${quem} respondeu você`, corpo: com(t, ex) };
    case 'acompanhando': return { titulo: `Resposta nova em ${t}`, corpo: com(quem, ex) };
    case 'mencao': return { titulo: `${quem} mencionou você`, corpo: com(t, ex) };
    case 'reacao': return { titulo: `${quem} reagiu à sua ${d.target === 'resposta' ? 'resposta' : 'mensagem'}`, corpo: t };
    case 'clube_resposta': return { titulo: `${quem} respondeu você no clube ${t}`, corpo: ex };
    case 'clube_mencao': return { titulo: `${quem} mencionou você no clube ${t}`, corpo: ex };
    case 'lista_convite': return { titulo: `${quem} convidou você para editar uma lista`, corpo: t };
    case 'clube_convite': return { titulo: `${quem} convidou você para um clube`, corpo: t };
    case 'clube_jogo': return { titulo: `O clube ${t} começou um jogo novo`, corpo: n.excerpt ?? '' };
    case 'clube_jogatina': return { titulo: `Jogatina nova no clube ${t}`, corpo: [n.excerpt, quando(d.startsAt)].filter(Boolean).join(' · ') };
    case 'parte': return { titulo: `Parte nova no clube ${t}`, corpo: n.excerpt ?? '' };
    case 'jogatina_resposta': return { titulo: `${quem} respondeu você na jogatina`, corpo: com(t, ex) };
    case 'jogatina_mencao': return { titulo: `${quem} mencionou você na jogatina`, corpo: com(t, ex) };
    case 'jogatina_convite': return { titulo: `${quem} convidou você para uma jogatina`, corpo: [t, quando(d.startsAt)].filter(Boolean).join(' · ') };
    case 'jogatina_lembrete': {
      const h = hora(d.startsAt), ja = typeof d.startsAt === 'string' && Date.parse(d.startsAt) <= Date.now();
      return { titulo: ja ? `A jogatina ${t} está começando` : h ? `A jogatina ${t} começa às ${h}` : `A jogatina ${t} começa daqui a pouco`, corpo: 'Toque para abrir.' };
    }
    case 'jogatina_mudou': return d.what === 'cancelada' ? { titulo: `A jogatina ${t} foi cancelada`, corpo: '' } : { titulo: `A jogatina ${t} mudou de horário`, corpo: quando(d.startsAt) };
    case 'seguiu': return d.friends ? { titulo: `${quem} seguiu você de volta`, corpo: 'Agora vocês são amigos.' } : { titulo: `${quem} começou a seguir você`, corpo: '' };
    case 'lancamento': return { titulo: `Saiu ${t}`, corpo: 'Está na sua lista de desejos ou no Radar.' };
    case 'retomada': return { titulo: `Faz um tempo que você não volta a ${t}`, corpo: 'Quer ver onde parou?' };
    case 'semana': {
      const s = Number(d.sessions ?? 0), m = Number(d.minutes ?? 0), gs = Array.isArray(d.games) ? (d.games as string[]) : [];
      const h = m ? (m < 60 ? `${m} min` : `${(Math.round(m / 6) / 10).toString().replace('.', ',')} h`) : '';
      return { titulo: 'Sua semana de jogo', corpo: [`${s} ${s === 1 ? 'sessão' : 'sessões'}`, h, gs.length ? `em ${gs.slice(0, 3).join(', ')}` : ''].filter(Boolean).join(' · ') };
    }
    case 'mes': return { titulo: 'Seu mês de jogo', corpo: 'O resumo do mês passado está pronto.' };
    case 'revisao': return { titulo: 'Revisão do backlog', corpo: 'Hora de olhar com calma o que está parado. Sem culpa.' };
    case 'pacto': return { titulo: `${quem} chamou você para um pacto`, corpo: t };
    case 'pacto_zerou': return { titulo: `${quem} zerou ${t}`, corpo: 'No pacto de vocês.' };
    default: return { titulo: t || 'Aviso do WinnerZ', corpo: n.excerpt ?? '' };
  }
}


/** "agora", "5 min", "2 h", "ontem", "3 d". */
function ha(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `${d} d`;
}

let twitch: { token: string; ate: number } | null = null;
async function aoVivo(id: string): Promise<{ titulo: string; jogo: string; viewers: number } | null> {
  const cid = process.env.TWITCH_CLIENT_ID, sec = process.env.TWITCH_CLIENT_SECRET;
  if (!cid || !sec || !/^\d+$/.test(id)) return null;
  try {
    if (!twitch || twitch.ate < Date.now() + 60_000) {
      const t = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${cid}&client_secret=${sec}&grant_type=client_credentials`, { method: 'POST', signal: AbortSignal.timeout(4000) });
      const j = (await t.json()) as { access_token?: string; expires_in?: number };
      if (!j.access_token) return null;
      twitch = { token: j.access_token, ate: Date.now() + (j.expires_in ?? 3600) * 1000 };
    }
    const r = await fetch(`https://api.twitch.tv/helix/streams?user_id=${id}`, { headers: { 'Client-Id': cid, Authorization: `Bearer ${twitch.token}` }, signal: AbortSignal.timeout(4000) });
    const s = ((await r.json()) as { data?: { title?: string; game_name?: string; viewer_count?: number }[] }).data?.[0];
    return s ? { titulo: s.title ?? '', jogo: s.game_name ?? '', viewers: s.viewer_count ?? 0 } : null;
  } catch { return null; }
}

/** O painel do banco, com os avisos já em frase e a live conferida na Twitch. */
async function painel(c: { url: string; headers: Record<string, string> }, chave: string) {
  const p = await rpc<Record<string, unknown>>(c, 'app_painel', { p_key: chave });
  const av = p.avisos as { lista?: { items?: Item[] }; conta?: { unread?: number } } | null;
  const itens = (av?.lista?.items ?? []).map((n) => {
    const a = n.actors?.[0]?.handle, mais = (n.actorCount ?? 1) - 1;
    const quem = a ? `@${a}${mais > 0 ? ` e mais ${mais}` : ''}` : 'Alguém';
    const { titulo, corpo } = texto(n, quem);
    return { texto: corta(titulo, 70), corpo: corta(corpo, 90), quando: ha(n.at), link: n.link && n.link.startsWith('/') ? n.link : '/avisos', lido: !!n.read };
  });
  const canal = p.canal as { login?: string; id?: string; inicio?: string } | null;
  let live: Record<string, unknown> | null = null;
  if (canal?.login) {
    const s = canal.id ? await aoVivo(canal.id) : null;
    live = { login: canal.login, url: `https://www.twitch.tv/${canal.login}`, aoVivo: !!s || !!canal.inicio, titulo: s?.titulo ?? '', jogo: s?.jogo ?? '', viewers: s?.viewers ?? null, inicio: canal.inicio ?? null };
  }
  return { ...p, avisos: { naoLidos: av?.conta?.unread ?? 0, itens }, canal: undefined, live };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  const c = db();
  if (!c) { res.status(503).json({ error: 'not_configured' }); return; }
  const chave = um(req.headers?.['x-winnerz-chave']).trim();
  if (!/^[0-9a-f]{64}$/.test(chave)) { res.status(401).json({ error: 'chave_invalida' }); return; }
  const body = (typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body as string); } catch { return {}; } })() : req.body ?? {}) as Record<string, unknown>;
  const acao = typeof body.acao === 'string' ? body.acao : '';
  try {
    if (acao === 'painel') { res.status(200).json(await painel(c, chave)); return; }
    if (acao === 'esquecer') { await rpc(c, 'app_esquecer', { p_key: chave }); res.status(200).json({ ok: true }); return; }
    if (acao === 'momento') {
      const dados: Record<string, unknown> = { tipo: body.tipo === 'ponto' ? 'ponto' : 'momento', titulo: body.titulo ?? '', nota: body.nota ?? '' };
      const img = typeof body.imagem === 'string' ? body.imagem.replace(/^data:image\/\w+;base64,/, '') : '';
      if (img) {
        const bytes = Buffer.from(img, 'base64');
        if (bytes.length > 6_000_000) throw new Recusa(413, 'foto_grande');
        const u = await rpc<string>(c, 'app_quem', { p_key: chave });
        const id = randomUUID(), caminho = `${u}/${id}.jpg`;
        const up = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${caminho}`, {
          method: 'POST', headers: { apikey: c.headers.apikey, Authorization: c.headers.Authorization, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': '31536000' }, body: bytes,
        });
        if (!up.ok) throw new Recusa(502, 'foto');
        dados.id = id; dados.imagem = caminho;
      }
      res.status(200).json(await rpc(c, 'app_acao', { p_key: chave, p_acao: 'momento', p: dados })); return;
    }
    if (ACOES.has(acao)) {
      const { acao: _a, ...dados } = body;
      res.status(200).json(await rpc(c, 'app_acao', { p_key: chave, p_acao: acao, p: dados })); return;
    }
    res.status(400).json({ error: 'acao' });
  } catch (e) {
    if (e instanceof Recusa) { res.status(e.codigo).json({ error: e.message }); return; }
    res.status(500).json({ error: 'erro' });
  }
}
