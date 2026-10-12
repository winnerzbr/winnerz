/**
 * Retomada Inteligente (R1): a pessoa manda uma foto da tela e, se quiser, uma nota curta.
 * Um modelo de visão lê a tela e sugere a Cápsula de Retomada. A sugestão volta como "Inferido";
 * só vira registro quando a pessoa confirma no site. A foto não é guardada aqui.
 *
 *   POST /api/retomada  (com login)  { image: "<jpeg em base64>", note?, game, context? }
 *   GET  /api/retomada  (com login)  → { enabled, used, limit }
 *
 * Variáveis na Vercel:
 *   ANTHROPIC_API_KEY  (obrigatória para ligar)   ANTHROPIC_MODEL (opcional)   AI_MONTHLY_LIMIT (opcional, padrão 30)
 *   SUPABASE_URL + SUPABASE_SECRET_KEY (já usadas pelo IGDB), para conferir o login e contar o uso.
 */

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const LIMIT = () => Math.max(0, Number(process.env.AI_MONTHLY_LIMIT ?? 30) || 30);

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const headers: Record<string, string> = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' };
  return { url, headers };
}

const header = (req: Req, k: string) => { const v = req.headers?.[k] ?? req.headers?.[k.toLowerCase()]; return Array.isArray(v) ? v[0] : v; };

async function requireUser(req: Req): Promise<string | null> {
  const c = db();
  const token = (header(req, 'authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!c || !token) return null;
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.headers.apikey, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}

const month = () => new Date().toISOString().slice(0, 7);

async function usage(user: string): Promise<number> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/ai_usage?select=uses&user_id=eq.${user}&month=eq.${month()}`, { headers: c.headers });
  if (!r.ok) throw new Error('Falta rodar a migração 0008 no Supabase.');
  const rows = (await r.json()) as { uses: number }[];
  return rows[0]?.uses ?? 0;
}

async function addUse(user: string, uses: number) {
  const c = db()!;
  await fetch(`${c.url}/rest/v1/ai_usage?on_conflict=user_id,month`, {
    method: 'POST', headers: { ...c.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: user, month: month(), uses: uses + 1, updated_at: new Date().toISOString() }),
  });
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

const SYSTEM = `Você ajuda uma pessoa a retomar um videogame depois de um tempo longe.
Ela manda uma foto da tela (às vezes tirada do celular, torta ou com reflexo) e talvez uma nota.
Leia o que estiver visível: menu de pausa, mapa, objetivo, missão, inventário, nome de área, legenda.
Responda SOMENTE com um objeto JSON, sem texto antes ou depois, com estas chaves (strings em português do Brasil, curtas, no máximo 140 caracteres cada; use "" quando a tela não mostrar):
{"where": "onde a pessoa está no jogo (área, capítulo, missão)",
 "doing": "o que ela estava fazendo",
 "next": "o próximo passo indicado na tela (objetivo, marcador)",
 "remember": "algo útil para não esquecer (item, chave, chefe, configuração)",
 "seen": "uma frase sobre o que você viu na imagem",
 "confidence": "alta" | "media" | "baixa"}
Nunca invente nomes, lugares ou objetivos que não estejam na imagem ou na nota. Se não der para ler, deixe vazio e use confidence "baixa".
Não dê dicas de solução nem spoilers além do que está na tela.`;

export default async function handler(req: Req, res: Res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const enabled = !!process.env.ANTHROPIC_API_KEY && !!db();
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta para usar a Retomada Inteligente.' });
    if (req.method !== 'POST') return res.status(200).json({ enabled, used: enabled ? await usage(user).catch(() => 0) : 0, limit: LIMIT() });
    if (!enabled) return res.status(503).json({ error: 'A Retomada Inteligente ainda não foi ligada (falta a chave da IA no servidor).' });

    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as { image?: string; note?: string; game?: string; context?: string };
    const image = String(body.image ?? '').replace(/^data:image\/\w+;base64,/, '');
    if (!image || image.length > 2_800_000) return res.status(400).json({ error: 'Envie uma foto (até uns 2 MB).' });

    const used = await usage(user);
    if (used >= LIMIT()) return res.status(429).json({ error: `Você já usou as ${LIMIT()} sugestões deste mês. A Cápsula continua funcionando sem a IA.`, used, limit: LIMIT() });

    const text = [
      `Jogo: ${clip(body.game, 120) || 'não informado'}.`,
      body.note ? `Nota da pessoa: ${clip(body.note, 400)}` : '',
      body.context ? `O que ela já tinha registrado antes (pode estar desatualizado): ${clip(body.context, 600)}` : '',
    ].filter(Boolean).join('\n');

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(), max_tokens: 600, system: SYSTEM,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, { type: 'text', text }] }],
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('anthropic', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: r.status === 429 || r.status === 529 ? 'A IA está ocupada agora. Tente de novo em instantes.' : 'A IA não respondeu agora. Tente de novo.' });
    }
    const out = (await r.json()) as { content?: { type: string; text?: string }[] };
    const raw = (out.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(json); } catch { return res.status(502).json({ error: 'Não consegui entender a resposta da IA. Tente outra foto.' }); }
    await addUse(user, used);
    return res.status(200).json({
      suggestion: { where: clip(parsed.where, 160), doing: clip(parsed.doing, 160), next: clip(parsed.next, 160), remember: clip(parsed.remember, 160) },
      seen: clip(parsed.seen, 200),
      confidence: ['alta', 'media', 'baixa'].includes(String(parsed.confidence)) ? parsed.confidence : 'baixa',
      used: used + 1, limit: LIMIT(),
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Algo deu errado.' });
  }
}
