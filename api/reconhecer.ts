/**
 * Adicionar pela câmera (Etapa 5, entrega 6). Tudo com login; nada vai para a coleção daqui:
 * o site só mostra candidatos, e a pessoa confirma cada um.
 *
 *   GET  /api/reconhecer                → { ai, used, limit }        (a foto pela IA está ligada?)
 *   GET  /api/reconhecer?ean=7891234…   → { code, matches, product }  (jogos já confirmados com esse código + nome na base pública)
 *   POST /api/reconhecer { kind: 'foto', image }                       → { games: [{ title, platform, barcode, confidence }], seen }
 *   POST /api/reconhecer { kind: 'ensinar', code, igdbId, slug, title, platform }  → { ok }  (depois que a pessoa confirmou)
 *
 * Variáveis na Vercel (as mesmas da Retomada): ANTHROPIC_API_KEY, ANTHROPIC_MODEL (opcional), AI_MONTHLY_LIMIT (opcional),
 * SUPABASE_URL + SUPABASE_SECRET_KEY. A foto não é guardada. Precisa da migração 0020 (e da 0008, do limite da IA).
 */

type Req = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const LIMIT = () => { const n = Number(process.env.AI_MONTHLY_LIMIT ?? 30); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 30; };
const MISS_DAYS = 30;

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const headers: Record<string, string> = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' };
  return { url, headers };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const header = (req: Req, k: string) => one(req.headers?.[k] ?? req.headers?.[k.toLowerCase()]);

function fromOurSite(req: Req): boolean {
  const site = header(req, 'sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
  const from = header(req, 'origin') ?? header(req, 'referer');
  if (!host || !from) return false;
  try { return new URL(from).host === host; } catch { return false; }
}

async function requireUser(req: Req): Promise<string | null> {
  const c = db();
  const token = (header(req, 'authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!c || !token) return null;
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.headers.apikey, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}

const month = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);

async function usage(user: string): Promise<number> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/ai_usage?select=uses&user_id=eq.${user}&month=eq.${month()}`, { headers: c.headers });
  if (!r.ok) return 0;
  return ((await r.json()) as { uses: number }[])[0]?.uses ?? 0;
}
async function reserve(user: string): Promise<number> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/rpc/ai_reserve`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_user: user, p_month: month(), p_limit: LIMIT() }) });
  if (!r.ok) throw new Error('Falta rodar a migração 0008 no Supabase.');
  const v = await r.json();
  return typeof v === 'number' ? v : -1;
}
async function refund(user: string) {
  const c = db()!;
  await fetch(`${c.url}/rest/v1/rpc/ai_refund`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_user: user, p_month: month() }) }).catch(() => null);
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

/** Dígito verificador (EAN-8, UPC-A, EAN-13, GTIN-14) e formato único: UPC-A vira EAN-13. */
function normalizeCode(raw: unknown): string | null {
  let c = String(raw ?? '').replace(/\D/g, '');
  if (!/^\d{8}$|^\d{12,14}$/.test(c)) return null;
  const d = c.split('').map(Number);
  const check = d.pop()!;
  let sum = 0;
  for (let i = d.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += d[i] * w;
  if ((10 - (sum % 10)) % 10 !== check) return null;
  if (c.length === 12) c = `0${c}`;
  if (c.length === 14 && c.startsWith('0')) c = c.slice(1);
  return c;
}

type Vote = { igdb_id: number | null; slug: string; title: string; platform: string | null };

/** Os jogos que as pessoas já confirmaram para este código, do mais votado para o menos. */
async function matchesFor(code: string) {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/barcode_votes?select=igdb_id,slug,title,platform&code=eq.${code}&limit=500`, { headers: c.headers });
  if (!r.ok) throw new Error('Falta rodar a migração 0020 no Supabase.');
  const rows = (await r.json()) as Vote[];
  const by = new Map<string, { igdbId?: number; slug: string; title: string; platforms: Map<string, number>; votes: number }>();
  for (const v of rows) {
    const m = by.get(v.slug) ?? { igdbId: v.igdb_id ?? undefined, slug: v.slug, title: v.title, platforms: new Map(), votes: 0 };
    m.votes++;
    if (v.platform) m.platforms.set(v.platform, (m.platforms.get(v.platform) ?? 0) + 1);
    by.set(v.slug, m);
  }
  return [...by.values()].sort((a, b) => b.votes - a.votes).slice(0, 4).map((m) => ({
    igdbId: m.igdbId, slug: m.slug, title: m.title, votes: m.votes,
    platform: [...m.platforms.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
  }));
}

/** O nome do produto na base pública de códigos (UPCitemdb, plano gratuito), guardado no banco para não perguntar de novo. */
async function productFor(code: string): Promise<{ title: string; brand?: string } | null> {
  const c = db()!;
  const cached = await fetch(`${c.url}/rest/v1/barcode_lookup?select=title,brand,fetched_at&code=eq.${code}`, { headers: c.headers });
  if (cached.ok) {
    const row = ((await cached.json()) as { title: string | null; brand: string | null; fetched_at: string }[])[0];
    if (row?.title) return { title: row.title, brand: row.brand ?? undefined };
    if (row && Date.now() - Date.parse(row.fetched_at) < MISS_DAYS * 864e5) return null;
  }
  let title = '', brand = '';
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (r.status === 429 || r.status >= 500) return null; // limite do dia ou fora do ar: não guarda nada, tenta outro dia
    if (r.ok) {
      const j = (await r.json()) as { items?: { title?: string; brand?: string }[] };
      title = clip(j.items?.[0]?.title, 200); brand = clip(j.items?.[0]?.brand, 80);
    }
  } catch { return null; }
  await fetch(`${c.url}/rest/v1/barcode_lookup?on_conflict=code`, {
    method: 'POST', headers: { ...c.headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ code, title: title || null, brand: brand || null, source: 'upcitemdb', fetched_at: new Date().toISOString() }),
  }).catch(() => null);
  return title ? { title, brand: brand || undefined } : null;
}

const SYSTEM = `Você ajuda uma pessoa a cadastrar a coleção de videogames dela.
Ela manda uma foto (do celular) com uma ou mais caixas, capas, cartuchos ou discos de jogos.
Identifique cada JOGO visível. Use o que estiver escrito: título na capa ou na lombada, logotipo, faixa da plataforma, selo.
Responda SOMENTE com um objeto JSON, sem texto antes ou depois:
{"games": [{"title": "nome do jogo como no catálogo internacional (em inglês quando for o nome oficial)",
            "platform": "plataforma, se der para ver (ex.: PlayStation 4, Nintendo Switch, Xbox One); senão \\"\\"",
            "barcode": "os dígitos do código de barras, só se estiverem legíveis na foto; senão \\"\\"",
            "confidence": "alta" | "media" | "baixa"}],
 "seen": "uma frase curta, em português do Brasil, sobre o que você viu"}
Liste no máximo 24 jogos, cada um uma vez (duas cópias iguais contam uma vez). Ignore consoles, controles e objetos que não sejam jogos.
Nunca invente um jogo que não dá para ler ou reconhecer: se não der, deixe de fora. Se não houver jogo nenhum, devolva "games": [].`;

export default async function handler(req: Req, res: Res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!fromOurSite(req)) return res.status(403).json({ error: 'Uso restrito ao WinnerZ.' });
    const c = db();
    const ai = !!process.env.ANTHROPIC_API_KEY && !!c;
    const user = await requireUser(req);
    if (!user || !c) return res.status(401).json({ error: 'Entre na sua conta para adicionar pela câmera.' });

    if (req.method !== 'POST') {
      const raw = one(req.query?.ean);
      if (raw == null) return res.status(200).json({ ai, used: ai ? await usage(user) : 0, limit: LIMIT() });
      const code = normalizeCode(raw);
      if (!code) return res.status(400).json({ error: 'Esse código não parece um código de barras válido. Confira os números.' });
      const matches = await matchesFor(code);
      const product = matches.length ? null : await productFor(code); // já confirmado por alguém: nem gasta a consulta pública
      return res.status(200).json({ code, matches, product });
    }

    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as Record<string, unknown>;

    if (body.kind === 'ensinar') {
      const code = normalizeCode(body.code);
      const slug = clip(body.slug, 200), title = clip(body.title, 200), platform = clip(body.platform, 80) || null;
      const igdbId = Number.isInteger(body.igdbId) ? (body.igdbId as number) : null;
      if (!code || !slug || !title) return res.status(400).json({ error: 'Faltou o código ou o jogo.' });
      const r = await fetch(`${c.url}/rest/v1/barcode_votes?on_conflict=code,user_id`, {
        method: 'POST', headers: { ...c.headers, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ code, user_id: user, igdb_id: igdbId, slug, title, platform, created_at: new Date().toISOString() }),
      });
      if (!r.ok) return res.status(500).json({ error: 'Falta rodar a migração 0020 no Supabase.' });
      return res.status(200).json({ ok: true });
    }

    if (body.kind !== 'foto') return res.status(400).json({ error: 'Pedido desconhecido.' });
    if (!ai) return res.status(503).json({ error: 'O reconhecimento por foto ainda não foi ligado (falta a chave da IA no servidor).' });
    const image = String(body.image ?? '').replace(/^data:image\/\w+;base64,/, '');
    if (!image || image.length > 3_000_000) return res.status(400).json({ error: 'Envie uma foto (até uns 2 MB).' });

    const used = await reserve(user);
    if (used < 0) return res.status(429).json({ error: `Você já usou as ${LIMIT()} leituras da IA deste mês. O código de barras e a busca pelo nome continuam funcionando.`, used: LIMIT(), limit: LIMIT() });

    let r: Response;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL(), max_tokens: 1500, system: SYSTEM,
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, { type: 'text', text: 'Quais jogos aparecem nesta foto?' }] }],
        }),
      });
    } catch { await refund(user); return res.status(502).json({ error: 'A IA não respondeu agora. Tente de novo.' }); }
    if (!r.ok) {
      await refund(user);
      console.error('anthropic', r.status, (await r.text().catch(() => '')).slice(0, 300));
      return res.status(502).json({ error: r.status === 429 || r.status === 529 ? 'A IA está ocupada agora. Tente de novo em instantes.' : 'A IA não respondeu agora. Tente de novo.' });
    }
    const out = (await r.json()) as { content?: { type: string; text?: string }[] };
    const text = (out.content ?? []).filter((x) => x.type === 'text').map((x) => x.text).join('');
    let parsed: { games?: unknown; seen?: unknown } = {};
    try { parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { await refund(user); return res.status(502).json({ error: 'Não consegui entender a resposta da IA. Tente outra foto.' }); }
    const seenTitles = new Set<string>();
    const games = (Array.isArray(parsed.games) ? parsed.games : []).slice(0, 24).map((g: Record<string, unknown>) => ({
      title: clip(g?.title, 160),
      platform: clip(g?.platform, 60),
      barcode: normalizeCode(g?.barcode) ?? '',
      confidence: ['alta', 'media', 'baixa'].includes(String(g?.confidence)) ? String(g.confidence) : 'baixa',
    })).filter((g) => { const k = `${g.title.toLowerCase()}|${g.platform.toLowerCase()}`; if (!g.title || seenTitles.has(k)) return false; seenTitles.add(k); return true; });
    return res.status(200).json({ games, seen: clip(parsed.seen, 200), used, limit: LIMIT() });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Algo deu errado.' });
  }
}
