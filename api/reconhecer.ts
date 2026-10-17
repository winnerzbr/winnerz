/**
 * Adicionar pela câmera (Etapa 5, entrega 6). Tudo com login; nada vai para a coleção daqui:
 * o site só mostra candidatos, e a pessoa confirma cada um.
 *
 *   GET  /api/reconhecer                → { ai, used, limit }        (a foto pela IA está ligada?)
 *   GET  /api/reconhecer?ean=7891234…   → { code, matches, product }  (jogos já confirmados com esse código + nome na base pública)
 *   POST /api/reconhecer { kind: 'foto', image }                       → { games: [{ title, platform, barcode, confidence }], seen }
 *   POST /api/reconhecer { kind: 'parte', game, image, where? }         → { picks: [{ id, confidence }], seen }  (S1: em que item da lista do jogo a foto está)
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

/** Mensagem clara para quando a IA recusa o pedido (sem expor chave nem detalhes da conta). */
function aiError(status: number, detail: string): string {
  let type = '', msg = '';
  try { const j = JSON.parse(detail) as { error?: { type?: string; message?: string } }; type = j.error?.type ?? ''; msg = j.error?.message ?? ''; } catch { /* sem corpo */ }
  if (status === 429 || status === 529 || type === 'overloaded_error' || type === 'rate_limit_error') return 'A IA está ocupada agora. Tente de novo em instantes.';
  if (status === 401 || type === 'authentication_error') return 'A chave da IA no servidor foi recusada. Confira a ANTHROPIC_API_KEY na Vercel.';
  if (status === 403 || type === 'permission_error') return 'A chave da IA no servidor não tem permissão para este modelo.';
  if (status === 404 || type === 'not_found_error') return 'O modelo de IA configurado não existe. Confira a ANTHROPIC_MODEL na Vercel (ou apague para usar o padrão).';
  if (/credit balance|billing|purchase credits/i.test(msg)) return 'A conta da IA está sem créditos. Recarregue em console.anthropic.com.';
  if (status === 400) return 'A IA recusou o pedido (formato). Tente de novo; se continuar, avise a administração.';
  return 'A IA não respondeu agora. Tente de novo.';
}
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

type AiOut = { content?: { type: string; text?: string; input?: unknown }[]; stop_reason?: string };
/** A foto como a IA espera: o tipo vem do próprio data URL (o site manda JPEG, mas não depende disso). */
function photo(raw: unknown): { data: string; type: string } {
  const s = String(raw ?? '');
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,/.exec(s);
  return { data: s.replace(/^data:image\/[\w+.-]+;base64,/, ''), type: m?.[1] ?? 'image/jpeg' };
}
/** A resposta da IA como objeto: pela ferramenta (formato garantido) ou, se vier texto, o primeiro {…} que for JSON válido. */
function aiJson(out: AiOut): Record<string, unknown> | null {
  const tool = (out.content ?? []).find((x) => x.type === 'tool_use');
  if (tool?.input && typeof tool.input === 'object') return tool.input as Record<string, unknown>;
  const text = (out.content ?? []).filter((x) => x.type === 'text').map((x) => x.text ?? '').join('').replace(/```(?:json)?/gi, '');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { const v = JSON.parse(text.slice(a, b + 1)); return v && typeof v === 'object' ? v as Record<string, unknown> : null; } catch { return null; }
}
/** Só o formato da falha vai para o log (nada da foto nem da pessoa). */
const aiShape = (out: AiOut) => `stop=${out.stop_reason ?? '?'} blocos=${(out.content ?? []).map((x) => x.type).join(',') || 'nenhum'}`;
const CONF = { type: 'string', enum: ['alta', 'media', 'baixa'] };
const GAMES_TOOL = {
  name: 'listar_jogos', description: 'Devolve os jogos identificados na foto.',
  input_schema: { type: 'object', required: ['games', 'seen'], properties: {
    games: { type: 'array', maxItems: 24, items: { type: 'object', required: ['title', 'confidence'], properties: { title: { type: 'string' }, platform: { type: 'string' }, barcode: { type: 'string' }, confidence: CONF } } },
    seen: { type: 'string' },
  } },
};
const PART_TOOL = {
  name: 'marcar_ponto', description: 'Devolve os itens da lista (pelo número) que batem com a foto, do mais provável para o menos.',
  input_schema: { type: 'object', required: ['picks', 'seen'], properties: {
    picks: { type: 'array', maxItems: 3, items: { type: 'object', required: ['n', 'confidence'], properties: { n: { type: 'integer', minimum: 1 }, confidence: CONF } } },
    seen: { type: 'string' },
  } },
};

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
Responda chamando a ferramenta listar_jogos, com:
{"games": [{"title": "nome do jogo como no catálogo internacional (em inglês quando for o nome oficial)",
            "platform": "plataforma, se der para ver (ex.: PlayStation 4, Nintendo Switch, Xbox One); senão \\"\\"",
            "barcode": "os dígitos do código de barras, só se estiverem legíveis na foto; senão \\"\\"",
            "confidence": "alta" | "media" | "baixa"}],
 "seen": "uma frase curta, em português do Brasil, sobre o que você viu"}
Liste no máximo 24 jogos, cada um uma vez (duas cópias iguais contam uma vez). Ignore consoles, controles e objetos que não sejam jogos.
Nunca invente um jogo que não dá para ler ou reconhecer: se não der, deixe de fora. Se não houver jogo nenhum, devolva "games": [].`;

/* ---- S1: em que capítulo (missão, área…) a pessoa está, pela foto da tela -------------------------------------- */

const PART_SYSTEM = `Você ajuda uma pessoa a marcar em que ponto de um videogame ela está.
Ela manda uma foto (da tela da TV, do monitor ou um print) e você recebe a lista numerada do jogo (capítulos, missões, áreas, chefes ou etapas, na ordem).
Use o que estiver na imagem: nome do capítulo ou da missão na tela, menu de pausa, mapa, objetivo, nome da área, chefe na tela, cenário, personagens, e o que você sabe do jogo.
Escolha SÓ entre os itens da lista, pelo número. Responda chamando a ferramenta marcar_ponto, com:
{"picks": [{"n": número do item, "confidence": "alta" | "media" | "baixa"}], "seen": "uma frase curta, em português do Brasil, sobre o que você viu (sem revelar nada da história que ainda não aparece na foto)"}
"picks" tem de 0 a 3 itens, do mais provável para o menos. Se a foto não mostrar o jogo ou não der para saber, devolva "picks": [].
Um chefe, uma região ou um cenário reconhecível conta: se você reconhece o chefe ou o lugar da foto e ele está na lista, escolha esse item.`;

type OutlineRow = { parts: { id: string; name: string; pct: number; group?: string; kind?: string }[]; structure?: string };

async function partFromPhoto(user: string, body: Record<string, unknown>, res: Res, ai: boolean) {
  const c = db()!;
  if (!ai) return res.status(503).json({ error: 'A leitura por foto ainda não foi ligada (falta a chave da IA no servidor).' });
  const gameId = clip(body.game, 80);
  const { data: image, type: imageType } = photo(body.image);
  if (!gameId) return res.status(400).json({ error: 'Faltou o jogo.' });
  if (!image || image.length > 3_000_000) return res.status(400).json({ error: 'Envie uma foto (até uns 2 MB).' });
  const [orow, grow] = await Promise.all([
    fetch(`${c.url}/rest/v1/game_outlines?select=parts,structure&game_id=eq.${encodeURIComponent(gameId)}`, { headers: c.headers }),
    fetch(`${c.url}/rest/v1/games?select=title,year&id=eq.${encodeURIComponent(gameId)}`, { headers: c.headers }),
  ]);
  const outline = orow.ok ? ((await orow.json()) as OutlineRow[])[0] : undefined;
  const game = grow.ok ? ((await grow.json()) as { title: string; year: number | null }[])[0] : undefined;
  const parts = [...(outline?.parts ?? [])].sort((a, b) => a.pct - b.pct);
  if (!game || parts.length < 2) return res.status(404).json({ error: 'Este jogo ainda não tem a lista para comparar com a foto.' });

  const used = await reserve(user);
  if (used < 0) return res.status(429).json({ error: `Você já usou as ${LIMIT()} leituras da IA deste mês. Escolha na lista ou escreva o nome.`, used: LIMIT(), limit: LIMIT() });
  const list = parts.map((p, i) => `${i + 1}. ${p.name}${p.group ? ` (${p.group})` : ''}${p.kind ? ` [${p.kind}]` : ''}`).join('\n');
  const hint = clip(body.where, 140);
  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(), max_tokens: 1024, system: PART_SYSTEM, tools: [PART_TOOL], tool_choice: { type: 'tool', name: PART_TOOL.name },
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imageType, data: image } },
          { type: 'text', text: `Jogo: ${game.title}${game.year ? ` (${game.year})` : ''}.\nLista (${outline?.structure ?? 'capitulos'}):\n${list}${hint ? `\nA pessoa escreveu: "${hint}"` : ''}\nEm qual item da lista esta foto está?` },
        ] }],
      }),
      signal: AbortSignal.timeout(40_000),
    });
  } catch { await refund(user); return res.status(502).json({ error: 'A IA não respondeu agora. Tente de novo.' }); }
  if (!r.ok) {
    await refund(user);
    const detail = await r.text().catch(() => '');
    console.error('anthropic parte', r.status, detail.slice(0, 300));
    return res.status(502).json({ error: aiError(r.status, detail) });
  }
  const out = (await r.json()) as AiOut;
  const parsed = aiJson(out) as { picks?: unknown; seen?: unknown } | null;
  if (!parsed) { await refund(user); console.error('anthropic parte ilegível', aiShape(out)); return res.status(502).json({ error: 'A IA não conseguiu ler esta foto agora. Tente de novo ou escolha na lista.' }); }
  const seen = new Set<string>();
  const picks = (Array.isArray(parsed.picks) ? parsed.picks : []).slice(0, 3).map((x: Record<string, unknown>) => {
    const p = parts[Math.round(Number(x?.n)) - 1];
    return p && !seen.has(p.id) && seen.add(p.id) ? { id: p.id, confidence: ['alta', 'media', 'baixa'].includes(String(x?.confidence)) ? String(x.confidence) : 'baixa' } : null;
  }).filter(Boolean);
  return res.status(200).json({ picks, seen: clip(parsed.seen, 200), used, limit: LIMIT() });
}

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

    if (body.kind === 'parte') return await partFromPhoto(user, body, res, ai);
    if (body.kind !== 'foto') return res.status(400).json({ error: 'Pedido desconhecido.' });
    if (!ai) return res.status(503).json({ error: 'O reconhecimento por foto ainda não foi ligado (falta a chave da IA no servidor).' });
    const { data: image, type: imageType } = photo(body.image);
    if (!image || image.length > 3_000_000) return res.status(400).json({ error: 'Envie uma foto (até uns 2 MB).' });

    const used = await reserve(user);
    if (used < 0) return res.status(429).json({ error: `Você já usou as ${LIMIT()} leituras da IA deste mês. O código de barras e a busca pelo nome continuam funcionando.`, used: LIMIT(), limit: LIMIT() });

    let r: Response;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL(), max_tokens: 2000, system: SYSTEM, tools: [GAMES_TOOL], tool_choice: { type: 'tool', name: GAMES_TOOL.name },
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: imageType, data: image } }, { type: 'text', text: 'Quais jogos aparecem nesta foto?' }] }],
        }),
      });
    } catch { await refund(user); return res.status(502).json({ error: 'A IA não respondeu agora. Tente de novo.' }); }
    if (!r.ok) {
      await refund(user);
      const detail = await r.text().catch(() => '');
      console.error('anthropic', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: aiError(r.status, detail) });
    }
    const out = (await r.json()) as AiOut;
    const parsed = aiJson(out) as { games?: unknown; seen?: unknown } | null;
    if (!parsed) { await refund(user); console.error('anthropic foto ilegível', aiShape(out)); return res.status(502).json({ error: 'A IA não conseguiu ler esta foto agora. Tente de novo.' }); }
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
