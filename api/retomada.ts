/**
 * Retomada Inteligente (R1): a pessoa manda uma foto da tela e, se quiser, uma nota curta.
 * Um modelo de visão lê a tela e sugere a Cápsula de Retomada. A sugestão volta como "Inferido";
 * só vira registro quando a pessoa confirma no site. A foto não é guardada aqui.
 *
 *   POST /api/retomada  (com login)  { image: "<jpeg em base64>", note?, game, context? }
 *   POST /api/retomada  (com login)  { kind: 'narrar', game, chapter, name, range, summary, facts[] } → { text, used, limit }
 *        Narra um capítulo da Jornada (J2b) só com os fatos enviados; a pessoa guarda ou descarta no site.
 *   GET  /api/retomada  (com login)  → { enabled, used, limit }
 *
 * Variáveis na Vercel:
 *   ANTHROPIC_API_KEY  (obrigatória para ligar)   ANTHROPIC_MODEL (opcional)   AI_MONTHLY_LIMIT (opcional, padrão 30)
 *   SUPABASE_URL + SUPABASE_SECRET_KEY (já usadas pelo IGDB), para conferir o login e contar o uso.
 */

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const LIMIT = () => { const n = Number(process.env.AI_MONTHLY_LIMIT ?? 30); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 30; };

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

/** Mês no horário de Brasília (o limite vira junto com o calendário da pessoa). */
const month = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);

async function usage(user: string): Promise<number> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/ai_usage?select=uses&user_id=eq.${user}&month=eq.${month()}`, { headers: c.headers });
  if (!r.ok) throw new Error('Falta rodar a migração 0008 no Supabase.');
  const rows = (await r.json()) as { uses: number }[];
  return rows[0]?.uses ?? 0;
}

/** Reserva um uso antes de chamar a IA (de uma vez só, sem corrida). Devolve o total, ou -1 se passou do limite. */
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

const NARRATE = `Você escreve a narração curta de um capítulo da jornada de uma pessoa com um videogame.
Use SOMENTE os fatos enviados. Não invente acontecimentos, lugares, personagens, sentimentos, números nem detalhes do jogo.
Não conte nada do jogo além do que está nos fatos (sem spoilers).
Escreva em português do Brasil, na segunda pessoa ("você"), em tom tranquilo e caloroso, em 2 ou 3 frases, no máximo 320 caracteres.
Não use adjetivos ou particípios que marquem o gênero da pessoa (prefira "você voltou" a "você ficou animado").
Responda só com o texto da narração, sem aspas e sem título.`;

async function narrate(user: string, body: Record<string, unknown>, res: Res) {
  const facts = Array.isArray(body.facts) ? body.facts.slice(0, 40).map((f) => clip(f, 220)).filter(Boolean) : [];
  if (!facts.length && !clip(body.summary, 10)) return res.status(400).json({ error: 'Este capítulo ainda não tem registros para narrar.' });
  const used = await reserve(user);
  if (used < 0) return res.status(429).json({ error: `Você já usou os ${LIMIT()} pedidos de IA deste mês.`, used: LIMIT(), limit: LIMIT() });
  const text = [
    `Jogo: ${clip(body.game, 120) || 'não informado'}.`,
    `Capítulo ${Number(body.chapter) || 1}: ${clip(body.name, 120)} (${clip(body.range, 60)}).`,
    `Resumo do site: ${clip(body.summary, 600)}`,
    facts.length ? `Registros, em ordem:\n- ${facts.join('\n- ')}` : '',
  ].filter(Boolean).join('\n');
  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 300, system: NARRATE, messages: [{ role: 'user', content: text }] }),
    });
  } catch { await refund(user); return res.status(502).json({ error: 'Não consegui falar com a IA agora (conexão). Tente de novo.' }); }
  if (!r.ok) {
    await refund(user);
    const detail = await r.text().catch(() => '');
    console.error('anthropic narrar', r.status, detail.slice(0, 300));
    return res.status(502).json({ error: aiError(r.status, detail) });
  }
  const out = (await r.json()) as { content?: { type: string; text?: string }[] };
  const said = clip((out.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(' ').replace(/^["“]|["”]$/g, ''), 420);
  if (!said) { await refund(user); return res.status(502).json({ error: 'A IA não respondeu agora. Tente de novo.' }); }
  return res.status(200).json({ text: said, used, limit: LIMIT() });
}

export default async function handler(req: Req, res: Res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const enabled = !!process.env.ANTHROPIC_API_KEY && !!db();
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta para usar a Retomada Inteligente.' });
    if (req.method !== 'POST') return res.status(200).json({ enabled, used: enabled ? await usage(user).catch(() => 0) : 0, limit: LIMIT() });
    if (!enabled) return res.status(503).json({ error: 'A Retomada Inteligente ainda não foi ligada (falta a chave da IA no servidor).' });

    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as { kind?: string; image?: string; note?: string; game?: string; context?: string };
    if (body.kind === 'narrar') return narrate(user, body as Record<string, unknown>, res);
    const image = String(body.image ?? '').replace(/^data:image\/\w+;base64,/, '');
    if (!image || image.length > 2_800_000) return res.status(400).json({ error: 'Envie uma foto (até uns 2 MB).' });

    const used = await reserve(user);
    if (used < 0) return res.status(429).json({ error: `Você já usou as ${LIMIT()} sugestões deste mês. A Cápsula continua funcionando sem a IA.`, used: LIMIT(), limit: LIMIT() });

    const text = [
      `Jogo: ${clip(body.game, 120) || 'não informado'}.`,
      body.note ? `Nota da pessoa: ${clip(body.note, 400)}` : '',
      body.context ? `O que ela já tinha registrado antes (pode estar desatualizado): ${clip(body.context, 600)}` : '',
    ].filter(Boolean).join('\n');

    let r: Response;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL(), max_tokens: 600, system: SYSTEM,
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, { type: 'text', text }] }],
        }),
      });
    } catch { await refund(user); return res.status(502).json({ error: 'A IA não respondeu agora. Tente de novo.' }); }
    if (!r.ok) {
      await refund(user);
      const detail = await r.text().catch(() => '');
      console.error('anthropic', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: aiError(r.status, detail) });
    }
    const out = (await r.json()) as { content?: { type: string; text?: string }[] };
    const raw = (out.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(json); } catch { await refund(user); return res.status(502).json({ error: 'Não consegui entender a resposta da IA. Tente outra foto.' }); }
    return res.status(200).json({
      suggestion: { where: clip(parsed.where, 160), doing: clip(parsed.doing, 160), next: clip(parsed.next, 160), remember: clip(parsed.remember, 160) },
      seen: clip(parsed.seen, 200),
      confidence: ['alta', 'media', 'baixa'].includes(String(parsed.confidence)) ? parsed.confidence : 'baixa',
      used, limit: LIMIT(),
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Algo deu errado.' });
  }
}
