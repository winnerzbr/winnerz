/**
 * Avisos no celular (app WinnerZ, migração 0089): manda um aviso da Central de Avisos como notificação, pelo Firebase.
 *
 *   POST /api/push  { id: "<id do aviso>" }
 *   GET  /api/push  → { firebase, banco }: só diz se a configuração está no lugar (para conferir sem mexer em nada).
 *
 * Quem chama é o próprio banco (gatilho em notifications, via pg_net), só com o id. Aqui lemos o aviso com a chave
 * do servidor, marcamos como enviado (cada aviso sai uma vez só, mesmo que o pedido se repita), conferimos as
 * escolhas de cada celular da pessoa e mandamos. Celular que o Firebase diz que não existe mais sai da lista.
 *
 * Variáveis na Vercel:
 *   FIREBASE_SERVICE_ACCOUNT  o arquivo JSON da conta de serviço do Firebase (o conteúdo inteiro, ou em base64).
 *                             É um segredo: fica só na Vercel, nunca no repositório nem no site.
 *   SUPABASE_URL + SUPABASE_SECRET_KEY (já usadas pelas outras funções).
 */
import { createSign } from 'node:crypto';

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

type Aviso = { id: string; user_id: string; kind: string; actor: string | null; grp: string | null; title: string | null; excerpt: string | null; link: string | null; data: Record<string, unknown>; created_at: string };
type Celular = { token: string; platform: string; prefs: Record<string, boolean> | null };
type Conta = { client_email: string; private_key: string; project_id: string };

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } as Record<string, string> };
}

function contaFirebase(): Conta | null {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const c = JSON.parse(json) as Partial<Conta>;
    if (!c.client_email || !c.private_key || !c.project_id) return null;
    return { client_email: c.client_email, private_key: c.private_key.replace(/\\n/g, '\n'), project_id: c.project_id };
  } catch { return null; }
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
let acesso: { token: string; ate: number } | null = null;
/** Token de acesso do Google para o Firebase (vale 1 hora; guardamos enquanto a função estiver viva). */
async function tokenGoogle(c: Conta): Promise<string> {
  if (acesso && acesso.ate > Date.now() + 60_000) return acesso.token;
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({ iss: c.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 }));
  const ass = createSign('RSA-SHA256').update(`${cab}.${corpo}`).sign(c.private_key);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${cab}.${corpo}.${b64url(ass)}` }).toString(),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!r.ok || !j.access_token) throw new Error('google_token');
  acesso = { token: j.access_token, ate: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return acesso.token;
}

/** Grupo do aviso (as escolhas do celular são por grupo). Avisos do site e da moderação sempre chegam. */
function grupo(kind: string): 'conversas' | 'reacoes' | 'grupos' | 'amigos' | 'jornada' | 'sistema' {
  if (['resposta', 'acompanhando', 'mencao'].includes(kind)) return 'conversas';
  if (kind === 'reacao') return 'reacoes';
  if (kind.startsWith('clube_') || kind.startsWith('jogatina_') || kind === 'parte') return 'grupos';
  if (['seguiu', 'pacto', 'pacto_zerou', 'lista_convite'].includes(kind)) return 'amigos';
  if (['lancamento', 'retomada', 'semana', 'mes', 'revisao'].includes(kind)) return 'jornada';
  return 'sistema';
}
/** Padrão: tudo ligado, menos reações (chegariam demais). */
const ligado = (prefs: Record<string, boolean> | null, g: string) => (g === 'sistema' ? true : (prefs?.[g] ?? g !== 'reacoes'));

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
function texto(n: Aviso, quem: string): { titulo: string; corpo: string } {
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

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') { res.status(200).json({ firebase: !!contaFirebase(), banco: !!db() }); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  const c = db(), conta = contaFirebase();
  if (!c || !conta) { res.status(503).json({ error: 'not_configured' }); return; }
  const body = (typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body as string); } catch { return {}; } })() : req.body ?? {}) as { id?: unknown };
  const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  if (!id) { res.status(400).json({ error: 'id' }); return; }

  // Marca como enviado só se ainda não foi (e se é recente): o mesmo aviso nunca chega duas vezes.
  const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const m = await fetch(`${c.url}/rest/v1/notifications?id=eq.${id}&pushed_at=is.null&created_at=gte.${encodeURIComponent(desde)}`, {
    method: 'PATCH', headers: { ...c.headers, Prefer: 'return=representation' }, body: JSON.stringify({ pushed_at: new Date().toISOString() }),
  });
  const avisos = m.ok ? ((await m.json()) as Aviso[]) : [];
  const n = avisos[0];
  if (!n) { res.status(200).json({ ok: true, enviado: 0 }); return; }

  const g = grupo(n.kind);
  const cel = await fetch(`${c.url}/rest/v1/push_devices?user_id=eq.${n.user_id}&select=token,platform,prefs`, { headers: c.headers });
  const celulares = (cel.ok ? ((await cel.json()) as Celular[]) : []).filter((x) => ligado(x.prefs, g));
  if (!celulares.length) { res.status(200).json({ ok: true, enviado: 0 }); return; }

  let quem = 'Alguém';
  if (n.actor) {
    const p = await fetch(`${c.url}/rest/v1/profiles?id=eq.${n.actor}&select=handle`, { headers: c.headers });
    const h = p.ok ? ((await p.json()) as { handle?: string }[])[0]?.handle : undefined;
    if (h) quem = `@${h}`;
  }
  const { titulo, corpo } = texto(n, quem);
  const url = n.link && n.link.startsWith('/') ? n.link : '/avisos';
  const canal = g === 'jornada' ? 'jornada' : 'comunidade';

  let enviados = 0;
  try {
    const tk = await tokenGoogle(conta);
    for (const d of celulares) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${conta.project_id}/messages:send`, {
        method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: {
          token: d.token,
          notification: { title: corta(titulo, 110), ...(corpo ? { body: corta(corpo, 240) } : {}) },
          data: { url, aviso: n.id, tipo: n.kind },
          android: { priority: 'high', notification: { channel_id: canal, icon: 'ic_stat_winnerz', color: '#E2BE84', tag: n.grp ? `${n.kind}:${n.grp}` : n.id } },
          apns: { payload: { aps: { sound: 'default', 'thread-id': canal } } },
        } }),
      });
      if (r.ok) { enviados++; continue; }
      const err = (await r.json().catch(() => ({}))) as { error?: { status?: string; details?: { errorCode?: string }[] } };
      const cod = err.error?.details?.find((x) => x.errorCode)?.errorCode ?? err.error?.status;
      // Celular desinstalou o app ou o token venceu: tira da lista.
      if (cod === 'UNREGISTERED' || (cod === 'INVALID_ARGUMENT' && r.status === 400) || r.status === 404) {
        await fetch(`${c.url}/rest/v1/push_devices?token=eq.${encodeURIComponent(d.token)}`, { method: 'DELETE', headers: c.headers }).catch(() => null);
      }
    }
  } catch {
    res.status(502).json({ error: 'firebase' }); return;
  }
  res.status(200).json({ ok: true, enviado: enviados });
}
