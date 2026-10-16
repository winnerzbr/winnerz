/**
 * Retomada Inteligente (R1): a pessoa manda uma foto da tela e, se quiser, uma nota curta.
 * Um modelo de visão lê a tela e sugere a Cápsula de Retomada. A sugestão volta como "Inferido";
 * só vira registro quando a pessoa confirma no site. A foto não é guardada aqui.
 *
 *   POST /api/retomada  (com login)  { image: "<jpeg em base64>", note?, game, context? }
 *   POST /api/retomada  (com login)  { kind: 'narrar', game, chapter, name, range, summary, facts[] } → { text, used, limit }
 *        Narra um capítulo da Jornada (J2b) só com os fatos enviados; a pessoa guarda ou descarta no site.
 *   POST /api/retomada  (com login)  { kind: 'capitulos', game: "<id do jogo>" } → { state: 'pronto' | 'rodando' | 'sem_lista' | 'limite' | 'desistiu' }
 *        Monta o rascunho da estrutura de um jogo que ainda não tem lista (C1, migrações 0058 e 0060): a IA pesquisa
 *        na web (busca e leitura de páginas, começando pelas wikis que o IGDB conhece), escolhe como o jogo se divide
 *        (capítulos, missões, áreas, chefes, atos…) e devolve a lista. Fica guardada para todo mundo, marcada como
 *        "Inferido", com o crédito das fontes. Não conta no limite mensal da pessoa; há um limite por dia para o site
 *        todo (AI_OUTLINE_DAILY, padrão 50). Modelo: ANTHROPIC_OUTLINE_MODEL (padrão claude-sonnet-5-5).
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
  if (status === 400) return `A IA recusou o pedido (formato)${msg ? `: ${msg.slice(0, 140)}` : ''}. Tente de novo; se continuar, avise a administração.`;
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
      body: JSON.stringify({ model: MODEL(), max_tokens: 1500, system: NARRATE, messages: [{ role: 'user', content: text }] }),
    });
  } catch { await refund(user); return res.status(502).json({ error: 'Não consegui falar com a IA agora (conexão). Tente de novo.' }); }
  if (!r.ok) {
    await refund(user);
    const detail = await r.text().catch(() => '');
    console.error('anthropic narrar', r.status, detail.slice(0, 300));
    return res.status(502).json({ error: aiError(r.status, detail) });
  }
  const out = (await r.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
  let said = clip((out.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(' ').replace(/^["“]|["”]$/g, ''), 600);
  // Resposta cortada no limite: fica até a última frase completa.
  if (out.stop_reason === 'max_tokens') { const end = Math.max(said.lastIndexOf('. '), said.lastIndexOf('! '), said.endsWith('.') ? said.length - 1 : -1); said = end > 40 ? said.slice(0, end + 1) : ''; }
  if (!said) {
    await refund(user);
    console.error('anthropic narrar vazio', out.stop_reason, (out.content ?? []).map((c) => c.type).join(','));
    return res.status(502).json({ error: 'A IA não terminou a resposta desta vez. Tente de novo.' });
  }
  return res.status(200).json({ text: said, used, limit: LIMIT() });
}

/* ---- Clima dos jogos: classificação em lote, guardada para todo mundo (migração 0044) -------------------- */

const VIBES_SYSTEM = `Você classifica videogames pelo que a comunidade gamer costuma dizer deles (análises, fóruns, reputação geral).
Para cada jogo da lista, devolva notas de 0 a 3:
- relax: o quanto é tranquilo de jogar para descansar (3 = muito relaxante; 0 = nada).
- challenge: o quanto é conhecido pela dificuldade ou por exigir habilidade (3 = famoso por ser difícil).
- intensity: ritmo e tensão (3 = frenético, violento ou de terror; 0 = calmo).
- story: peso da narrativa (3 = a história é o centro).
- short: o quanto rende em sessões curtas de 20 a 30 minutos (3 = muito).
E "note": UMA frase curta em português, neutra, sem spoiler, sobre como a comunidade vê o jogo (até 110 caracteres). Se não conhecer o jogo, use notas medianas (relax 1, challenge 1, intensity 1, story 1, short 1) e note vazia.
Responda SÓ com JSON: {"games":[{"id":"...","relax":0,"challenge":0,"intensity":0,"story":0,"short":0,"note":"..."}]}`;

type VibeIn = { id: string; title: string; year?: number; platforms?: string[]; genres?: string };
const clamp3 = (v: unknown) => Math.max(0, Math.min(3, Math.round(Number(v) || 0)));

async function vibes(user: string, body: Record<string, unknown>, res: Res) {
  const c = db()!;
  const list = (Array.isArray(body.games) ? body.games : []).slice(0, 25).map((g: any): VibeIn | null => (g && typeof g.id === 'string' && typeof g.title === 'string'
    ? { id: g.id.slice(0, 80), title: g.title.slice(0, 120), year: Number.isFinite(g.year) ? g.year : undefined, platforms: Array.isArray(g.platforms) ? g.platforms.slice(0, 4).map(String) : undefined, genres: typeof g.genres === 'string' ? g.genres.slice(0, 120) : undefined }
    : null)).filter((x: VibeIn | null): x is VibeIn => !!x);
  if (!list.length) return res.status(400).json({ error: 'Nenhum jogo para classificar.' });
  // Só os que ainda não têm clima (o servidor confere; o cliente não decide).
  const ids = list.map((g) => g.id);
  const have = await fetch(`${c.url}/rest/v1/game_vibes?select=game_id&game_id=in.(${ids.map((i) => `"${i.replace(/"/g, '')}"`).join(',')})`, { headers: c.headers });
  if (!have.ok) return res.status(503).json({ error: 'Falta rodar a migração 0044 no Supabase.' });
  const known = new Set(((await have.json()) as { game_id: string }[]).map((r) => r.game_id));
  const todo = list.filter((g) => !known.has(g.id));
  if (!todo.length) return res.status(200).json({ done: 0 });
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const r = await fetch(`${c.url}/rest/v1/rpc/vibes_reserve`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_user: user, p_day: day, p_limit: 12 }) });
  const n = r.ok ? await r.json() : -1;
  if (typeof n !== 'number') return res.status(429).json({ error: 'Por hoje, a classificação dos jogos já foi pedida muitas vezes. Amanhã continua.' });
  const text = `Jogos:\n${todo.map((g) => `- id=${g.id} | ${g.title}${g.year ? ` (${g.year})` : ''}${g.platforms?.length ? ` | ${g.platforms.join(', ')}` : ''}${g.genres ? ` | gêneros IGDB: ${g.genres}` : ''}`).join('\n')}`;
  const ai = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 2500, system: VIBES_SYSTEM, messages: [{ role: 'user', content: text }] }),
  });
  if (!ai.ok) return res.status(502).json({ error: aiError(ai.status, await ai.text()) });
  const out = (await ai.json()) as { content?: { type: string; text?: string }[] };
  // Os modelos novos não aceitam começar a resposta por nós: o JSON vem inteiro e pegamos do primeiro "{".
  const txt = (out.content ?? []).filter((x) => x.type === 'text').map((x) => x.text ?? '').join('');
  const said = txt.slice(Math.max(0, txt.indexOf('{')));
  const tryParse = (t: string): { games?: any[] } | null => { try { return JSON.parse(t); } catch { return null; } };
  // Resposta cortada no limite: fecha no último jogo completo.
  const parsed = tryParse(said) ?? tryParse(said.slice(0, said.lastIndexOf(']}') + 2)) ?? tryParse(said.slice(0, said.lastIndexOf('}') + 1) + ']}');
  if (!parsed) return res.status(502).json({ error: 'A IA não respondeu no formato esperado. Tente de novo.' });
  const okIds = new Set(todo.map((g) => g.id));
  const rows = (parsed.games ?? []).filter((g) => g && okIds.has(String(g.id))).map((g) => ({
    game_id: String(g.id), relax: clamp3(g.relax), challenge: clamp3(g.challenge), intensity: clamp3(g.intensity), story: clamp3(g.story), short: clamp3(g.short),
    note: typeof g.note === 'string' ? g.note.slice(0, 140) : null, model: MODEL(), updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return res.status(200).json({ done: 0 });
  const w = await fetch(`${c.url}/rest/v1/game_vibes`, { method: 'POST', headers: { ...c.headers, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows) });
  if (!w.ok) return res.status(502).json({ error: 'Não consegui guardar a classificação agora.' });
  return res.status(200).json({ done: rows.length, vibes: rows });
}

/* ---- Estrutura do jogo: capítulos, missões, áreas… (C1, migrações 0058 e 0060) ------------------------------- */

const OUTLINE_DAILY = () => { const n = Number(process.env.AI_OUTLINE_DAILY ?? 50); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50; };
/** Modelo para montar a estrutura (pesquisa na web e organiza): mais capaz que o padrão, usado uma vez por jogo. */
const OUTLINE_MODEL = () => process.env.ANTHROPIC_OUTLINE_MODEL || 'claude-sonnet-5-5';
const STRUCTURES = ['capitulos', 'missoes', 'areas', 'chefes', 'atos', 'episodios', 'fases', 'mundos', 'etapas'];

let igdbToken: { value: string; expires: number } | null = null;
async function igdbWebsites(igdbId: number): Promise<string[]> {
  const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret || !igdbId) return [];
  if (!igdbToken || igdbToken.expires < Date.now() + 60_000) {
    const t = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: 'POST', signal: AbortSignal.timeout(5000) });
    if (!t.ok) return [];
    const j = (await t.json()) as { access_token: string; expires_in: number };
    igdbToken = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  }
  const r = await fetch('https://api.igdb.com/v4/websites', { method: 'POST', headers: { 'Client-ID': id, Authorization: `Bearer ${igdbToken.value}`, 'Content-Type': 'text/plain' }, body: `fields url; where game = ${Math.floor(igdbId)}; limit 50;`, signal: AbortSignal.timeout(5000) });
  if (!r.ok) return [];
  return ((await r.json()) as { url?: string }[]).map((w) => w.url ?? '').filter(Boolean);
}

/** As wikis do jogo que o IGDB conhece (Fandom e Wikipedia): viram ponto de partida para a pesquisa. */
export function wikiHints(urls: string[]): string[] {
  const fandom = urls.filter((u) => /^https?:\/\/[a-z0-9-]+\.fandom\.com\//i.test(u));
  const wiki = urls.filter((u) => /^https?:\/\/(en|pt)\.wikipedia\.org\/wiki\//i.test(u));
  const other = urls.filter((u) => /wiki|guide/i.test(u) && !fandom.includes(u) && !wiki.includes(u));
  return [...fandom.slice(0, 2), ...wiki.slice(0, 1), ...other.slice(0, 1)];
}

const OUTLINE_SYSTEM = `Você monta a estrutura de progressão de um videogame para uma pessoa acompanhar, na linha do tempo, onde está no jogo.
Pesquise antes de responder: use a busca na web e leia uma ou duas páginas boas (a wiki do jogo, um detonado completo, uma lista de capítulos ou missões). Quando receber links de wiki, comece por eles: procure a página de capítulos, missões, walkthrough ou progressão. Use também o que você já sabe do jogo.
Escolha a estrutura que o próprio jogo usa:
- "capitulos" (jogos lineares divididos em capítulos), "missoes" (missões numeradas ou principais), "atos", "episodios", "fases" (fases ou níveis), "mundos" (mundos com fases),
- "areas" (jogos de exploração: regiões na ordem típica), "chefes" (quando o progresso é marcado por chefes),
- "etapas" (jogos grandes e não lineares, como Elden Ring: misture áreas, masmorras e chefes principais na ordem mais comum, usando "group" para a região e "kind" para o tipo).
Regras:
- Liste o caminho principal, na ordem do jogo. Itens opcionais importantes só se ajudarem a pessoa a se localizar (marque "kind": "opcional").
- Entre 4 e 50 itens. Em jogos com muitas missões pequenas, agrupe (por ato, região ou mundo) e use "group".
- Nomes oficiais em português do Brasil quando o jogo tiver tradução oficial que você conheça; senão, o nome original. Só traduza palavras genéricas (Chapter → Capítulo, Mission → Missão, Act → Ato). Nunca invente nomes.
- "pct": onde o item começa, de 0 a 100, pelo tempo de jogo da história principal (o primeiro é 0, sempre crescente).
- "minutes": duração típica do item, coerente com o tempo para zerar. Omita se não souber.
- "spoiler": true quando o nome revela reviravolta, morte, personagem ou lugar que só aparece mais adiante, ou o final.
- "stop": só se souber como o jogo salva ali: "qualquer", "fim", "pontos" (só em pontos de save) ou "longe" (pontos de save longe).
- "group": a região, o ato ou o mundo do item (até 40 caracteres), quando fizer sentido. "kind": tipo curto do item quando a estrutura mistura coisas (chefe, área, masmorra, opcional).
- Se depois de pesquisar não houver estrutura clara (jogo de corrida, esporte, multijogador, sandbox sem progressão), responda known false.
Formato da resposta: depois de pesquisar, NÃO escreva resumo, explicação nem a lista em texto; responda direto com UM bloco JSON compacto e nada depois (omita campos que não souber):
{"known": true, "structure": "capitulos", "confidence": "alta"|"media"|"baixa", "sources": [{"label": "nome do site", "url": "https://..."}], "parts": [{"name": "...", "pct": 0, "minutes": 60, "spoiler": false, "stop": "fim", "group": "...", "kind": "..."}]}`;

type GameRow = { id: string; title: string; year: number | null; igdb_id: number | null; ttb: { h?: number; n?: number; c?: number } | null; platforms: string[] | null };
type Block = { type: string; id?: string; text?: string; name?: string; input?: { query?: string; url?: string }; content?: unknown };

/** Pede a estrutura à IA com busca e leitura na web; continua a conversa quando a API pausa uma busca longa. */
async function askOutline(prompt: string, deadline: number): Promise<{ text: string; searches: number; fetches: number; stop: string; error?: string }> {
  const messages: { role: 'user' | 'assistant'; content: unknown }[] = [{ role: 'user', content: prompt }];
  let tools: Record<string, unknown>[] = [
    { type: 'web_search_20250305', name: 'web_search', max_uses: 4 },
    { type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 3, max_content_tokens: 12000 },
  ];
  let dropped = '';
  let searches = 0, fetches = 0, stop = '', text = '';
  for (let round = 0; round < 6; round++) {
    const left = deadline - Date.now();
    if (left < 6000) return { text, searches, fetches, stop: 'tempo', error: 'A pesquisa demorou demais.' };
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'web-fetch-2025-09-10' },
      body: JSON.stringify({ model: OUTLINE_MODEL(), max_tokens: 12000, system: OUTLINE_SYSTEM, ...(tools.length ? { tools } : {}), messages }),
      signal: AbortSignal.timeout(left - 2000),
    });
    if (!r.ok) {
      const d = await r.text().catch(() => '');
      console.error('anthropic estrutura', r.status, d.slice(0, 300));
      // Busca ou leitura desligadas na organização (Console): tenta sem a ferramenta recusada, depois só com o que a IA sabe.
      if (r.status === 400 && tools.length && /tool|web_/i.test(d) && round === 0 && messages.length === 1) {
        const bad = /web_fetch|fetch/i.test(d) ? 'web_fetch' : /web_search|search/i.test(d) ? 'web_search' : '';
        tools = bad ? tools.filter((t) => t.name !== bad) : [];
        dropped += `${dropped ? ', ' : ''}${bad || 'ferramentas'}`;
        round--;
        continue;
      }
      // A continuação foi recusada (ex.: pesquisa pendente): última tentativa só com o que a IA sabe.
      if (r.status === 400 && messages.length > 1 && !dropped.includes('continuação')) {
        messages.splice(0, messages.length, { role: 'user', content: `${prompt}\nA pesquisa na web não está disponível agora: responda com o que você sabe deste jogo.` });
        tools = [];
        dropped += `${dropped ? ', ' : ''}continuação`;
        continue;
      }
      return { text, searches, fetches, stop: `http ${r.status}${dropped ? ` · sem ${dropped}` : ''}`, error: aiError(r.status, d) };
    }
    const out = (await r.json()) as { content?: Block[]; stop_reason?: string };
    const blocks = out.content ?? [];
    searches += blocks.filter((b) => b.type === 'server_tool_use' && b.name === 'web_search').length;
    fetches += blocks.filter((b) => b.type === 'server_tool_use' && b.name === 'web_fetch').length;
    text = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
    const why = out.stop_reason ?? '';
    const client = blocks.filter((b) => b.type === 'tool_use');
    stop = why + (client.length ? `:${client.map((b) => b.name).join(',')}` : '') + (dropped ? ` · sem ${dropped}` : '');
    if (why === 'end_turn' || why === 'stop_sequence') break;
    if (why === 'pause_turn') { messages.push({ role: 'assistant', content: blocks }); continue; }
    if (why === 'tool_use') {
      // A IA pediu uma ferramenta que não roda no servidor da API: devolve "indisponível" e pede para seguir.
      messages.push({ role: 'assistant', content: blocks });
      if (client.length) messages.push({ role: 'user', content: client.map((b) => ({ type: 'tool_result', tool_use_id: b.id, is_error: true, content: 'Ferramenta indisponível. Use a busca e a leitura de páginas, ou o que você já sabe, e termine com o JSON.' })) });
      continue;
    }
    if (why === 'max_tokens' && !lastJson(text)) {
      // Escreveu demais antes da lista: pede só o JSON, compacto.
      messages.push({ role: 'assistant', content: blocks.filter((b) => b.type !== 'text' || (b.text ?? '').trim()) });
      messages.push({ role: 'user', content: 'A resposta foi cortada. Responda agora SÓ com o bloco JSON completo, compacto (sem espaços), com no máximo 40 itens; omita "minutes" e "stop" se precisar. Não pesquise mais.' });
      continue;
    }
    break;
  }
  return { text, searches, fetches, stop };
}

/** O último objeto JSON da resposta (a IA escreve antes o que pesquisou). */
export function lastJson(text: string): Record<string, unknown> | null {
  const t = text.replace(/```(?:json)?/gi, '');
  for (let end = t.lastIndexOf('}'); end > 0; end = t.lastIndexOf('}', end - 1)) {
    let depth = 0;
    for (let i = end; i >= 0; i--) {
      if (t[i] === '}') depth++;
      else if (t[i] === '{' && --depth === 0) {
        try { const v = JSON.parse(t.slice(i, end + 1)); if (v && typeof v === 'object' && ('parts' in v || 'known' in v)) return v; } catch { /* tenta o anterior */ }
        break;
      }
    }
  }
  return null;
}

async function outline(user: string, body: Record<string, unknown>, res: Res) {
  const c = db()!;
  const gameId = typeof body.game === 'string' ? body.game.slice(0, 80) : '';
  if (!gameId) return res.status(400).json({ error: 'Qual jogo?' });
  const rpcSvc = async (fn: string, args: Record<string, unknown>) => {
    const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: c.headers, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`rpc ${fn} ${r.status}`);
    return r.json();
  };
  // "Tentar de novo" na hora: só a administração.
  let force = false;
  if (body.force === true) {
    const a = await fetch(`${c.url}/rest/v1/profiles?select=is_admin&id=eq.${user}`, { headers: c.headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    force = !!(a as { is_admin?: boolean }[])[0]?.is_admin;
  }
  let start: string;
  try { start = await rpcSvc('outline_job_start', { p_game: gameId, p_limit: OUTLINE_DAILY(), p_force: force }); }
  catch {
    try { start = await rpcSvc('outline_job_start', { p_game: gameId, p_limit: OUTLINE_DAILY() }); }
    catch { return res.status(503).json({ error: 'Falta rodar a migração 0058 no Supabase.' }); }
  }
  if (start !== 'ok') return res.status(200).json({ state: start === 'pronto' ? 'pronto' : start === 'rodando' ? 'rodando' : start === 'limite' ? 'limite' : 'sem_lista' });
  const finish = async (state: 'feito' | 'sem_lista' | 'erro', note?: string) => { await rpcSvc('outline_job_finish', { p_game: gameId, p_state: state, p_note: note ?? null }).catch(() => null); };
  const deadline = Date.now() + 110_000;
  try {
    const gr = await fetch(`${c.url}/rest/v1/games?select=id,title,year,igdb_id,ttb,platforms&id=eq.${encodeURIComponent(gameId)}`, { headers: c.headers });
    const g = ((await gr.json()) as GameRow[])[0];
    if (!g) { await finish('sem_lista', 'Jogo não encontrado.'); return res.status(200).json({ state: 'sem_lista', reason: 'Jogo não encontrado.' }); }
    const hints = wikiHints(g.igdb_id ? await igdbWebsites(g.igdb_id).catch(() => []) : []);
    const ttb = g.ttb?.n ?? g.ttb?.h ?? g.ttb?.c;
    const prompt = [
      `Jogo: ${g.title}${g.year ? ` (${g.year})` : ''}${g.platforms?.length ? ` · ${g.platforms.slice(0, 4).join(', ')}` : ''}.`,
      ttb ? `Tempo típico para zerar (história principal): ${Math.round(ttb)} horas.` : 'Tempo para zerar: desconhecido.',
      hints.length ? `Wikis do jogo (pelo IGDB):\n${hints.join('\n')}` : 'O IGDB não tem link de wiki para este jogo; pesquise.',
      'Monte a estrutura de progressão deste jogo.',
    ].join('\n');
    const ai = await askOutline(prompt, deadline);
    const diag = `buscas ${ai.searches} · leituras ${ai.fetches} · ${ai.stop || 'sem fim'}`;
    if (ai.error) { await finish('erro', `${ai.error} (${diag})`); return res.status(200).json({ state: 'erro', reason: ai.error, diag }); }
    const parsed = lastJson(ai.text);
    const parts = cleanOutline(parsed?.known === false ? [] : parsed?.parts);
    if (parts.length < 3) {
      const why = !parsed ? 'A IA não devolveu a lista no formato esperado.' : parsed.known === false ? 'Depois de pesquisar, a IA não achou uma estrutura clara para este jogo.' : 'A lista da IA veio curta demais.';
      console.error('estrutura sem lista', gameId, diag, ai.text.slice(-400));
      await finish(parsed ? 'sem_lista' : 'erro', `${why} (${diag})`);
      return res.status(200).json({ state: parsed ? 'sem_lista' : 'erro', reason: why, diag });
    }
    const structure = STRUCTURES.includes(String(parsed?.structure)) ? String(parsed!.structure) : 'capitulos';
    const sources = (Array.isArray(parsed?.sources) ? parsed!.sources : []).slice(0, 4)
      .map((x: any) => ({ label: clip(x?.label, 60) || 'Fonte', url: typeof x?.url === 'string' && /^https?:\/\//.test(x.url) ? x.url.slice(0, 300) : '' }))
      .filter((x: { url: string }) => x.url)
      .map((x: { label: string; url: string }) => ({ ...x, ...(/fandom\.com|wikipedia\.org/i.test(x.url) ? { license: 'CC BY-SA' } : {}) }));
    let stored: unknown;
    try { stored = await rpcSvc('outline_ai_store', { p_game: gameId, p_parts: parts, p_sources: sources, p_structure: structure }); }
    catch { stored = await rpcSvc('outline_ai_store', { p_game: gameId, p_parts: parts, p_sources: sources }); }
    await finish('feito', stored ? diag : `já tinha lista (${diag})`);
    return res.status(200).json({ state: 'pronto', diag });
  } catch (e) {
    console.error('estrutura', e instanceof Error ? e.message : e);
    const why = e instanceof Error && /timeout|abort/i.test(e.name + e.message) ? 'A pesquisa demorou demais.' : 'Algo falhou ao montar a lista.';
    await finish('erro', why);
    return res.status(200).json({ state: 'erro', reason: why });
  }
}

type CleanPart = { id: string; name: string; pct: number; minutes?: number; spoiler?: boolean; stop?: string; group?: string; kind?: string };
/** Confere a lista da IA: nomes curtos, % crescente começando em 0, no máximo 60 itens. */
export function cleanOutline(raw: unknown): CleanPart[] {
  if (!Array.isArray(raw)) return [];
  const out: CleanPart[] = [];
  let last = -1;
  for (const p of raw.slice(0, 60)) {
    const name = typeof p?.name === 'string' ? p.name.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    if (!name || out.some((x) => x.name.toLowerCase() === name.toLowerCase() && (x.group ?? '') === (typeof p?.group === 'string' ? p.group.trim() : ''))) continue;
    let pct = Math.round(Number(p.pct));
    if (!Number.isFinite(pct)) pct = last + 1;
    pct = Math.max(out.length ? last + 1 : 0, Math.min(99, pct));
    if (!out.length) pct = 0;
    if (pct > 99) break;
    const minutes = Number(p.minutes);
    const group = typeof p.group === 'string' ? p.group.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    const kind = typeof p.kind === 'string' ? p.kind.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 20) : '';
    out.push({ id: `c${out.length + 1}`, name, pct, ...(Number.isFinite(minutes) && minutes >= 1 ? { minutes: Math.min(600, Math.round(minutes)) } : {}),
      ...(p.spoiler === true && out.length > 0 ? { spoiler: true } : {}), ...(['qualquer', 'fim', 'pontos', 'longe'].includes(p.stop) ? { stop: p.stop } : {}),
      ...(group ? { group } : {}), ...(kind ? { kind } : {}) });
    last = pct;
  }
  return out;
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
    if (body.kind === 'vibes') return vibes(user, body as Record<string, unknown>, res);
    if (body.kind === 'capitulos') return outline(user, body as Record<string, unknown>, res);
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
          model: MODEL(), max_tokens: 1500, system: SYSTEM,
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
