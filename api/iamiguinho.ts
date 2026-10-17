/**
 * IAmiguinho, Fase 2 (M4): a fala dos cameos da Jornada (jogo zerado e Retomada).
 *
 *   POST /api/iamiguinho  (com login)  { motivo: 'zerado' | 'primeiro-zerado' | 'voltou', escopo, fatos: { jogo?, dias? }, recentes?: string[] }
 *     → { mostrar: false }                       não é hora (modo da pessoa, ou outro aparelho já mostrou)
 *     → { mostrar: true, fala: string, fonte }   fala da IA, já checada
 *     → { mostrar: true, fala: null }            é hora, mas a fala vem da biblioteca do site
 *
 * Ordem (a ficha do personagem manda as regras do site antes de qualquer IA):
 *   1. modo da pessoa nas Preferências (Só quando eu chamar e Desativado: nada; Discreto: só marcos);
 *   2. intervalo do motivo e intervalo geral, conferidos no banco para valer em todos os aparelhos (migração 0071);
 *   3. teto de chamadas à IA por pessoa e para o site todo, por dia;
 *   4. a IA recebe só o momento, o nome do jogo e os dias; devolve opções, e a primeira que passar na checagem vale.
 * Se qualquer passo depois do 2 falhar, a resposta é { mostrar: true, fala: null } e o site usa a biblioteca.
 *
 * Variáveis na Vercel (as mesmas da Retomada Inteligente; nada novo para ligar):
 *   ANTHROPIC_API_KEY, SUPABASE_URL + SUPABASE_SECRET_KEY.
 *   Opcionais: IAMIGUINHO_MODEL (padrão: ANTHROPIC_MODEL ou claude-haiku-5-5), IAMIGUINHO_DIA_PESSOA (padrão 6),
 *   IAMIGUINHO_DIA_TOTAL (padrão 400).
 * Os registros nunca imprimem fala, jogo nem conta (o repositório é público).
 */

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

export type Motivo = 'zerado' | 'primeiro-zerado' | 'voltou';
export type Fatos = { jogo?: string; dias?: number };

const MOTIVOS: Motivo[] = ['zerado', 'primeiro-zerado', 'voltou'];
/** Intervalo de cada motivo, em dias, no mesmo escopo (igual ao do site em lib/iamiguinho). */
const INTERVALO: Record<Motivo, number> = { zerado: 36500, 'primeiro-zerado': 36500, voltou: 7 };
/** Momentos que a pessoa acabou de viver: não esperam o intervalo geral. */
const ESPECIAL: Partial<Record<Motivo, true>> = { zerado: true, 'primeiro-zerado': true };
const MARCO: Partial<Record<Motivo, true>> = { 'primeiro-zerado': true };

const MODEL = () => process.env.IAMIGUINHO_MODEL || process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const num = (v: string | undefined, d: number) => { const n = Number(v ?? d); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d; };

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
const rpc = async (fn: string, body: Record<string, unknown>) => {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: c.headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}`);
  return r.json() as Promise<unknown>;
};
/** Dia no horário de Brasília (o teto vira junto com o calendário da pessoa). */
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/* ---- Checagem da fala (exportada para os testes) ------------------------------------------------------------- */

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const palavras = (s: string) => semAcento(s.toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

/** Nomes que são dele (lore) ou do site: pode citar sem estar nos fatos. */
const NOMES_OK = new Set(['iamiguinho', 'winnerz', 'splatoon', 'aerospray', 'clash', 'blaster', 'sploosh', 'balacaxi', 'abacabala', 'souls',
  'jornada', 'jornadas', 'historia', 'historias', 'retomada', 'mural', 'album', 'radar', 'tutorial', 'tutoriais', 'enter', 'start']);
/** Números que são piada dele ("47 tutoriais"), nunca dado de alguém. */
const NUMEROS_OK = new Set(['47']);
const PROIBIDO: [RegExp, string][] = [
  [/\b(porra|caralho|merda|puta|puto|foda|fodase|fdp|cacete|bosta|desgraca|arrombad[oa]|viad[oa]|cu|buceta|pqp|vsf|krl)\b/, 'palavrão'],
  [/\b(idiota|burr[oa]|otari[oa]|imbecil|lixo|ridicul[oa]|fracassad[oa]|preguicos[oa])\b/, 'insulto'],
  [/\b(futebol|gol|golaco|campeonato|torcida|torcedor|brasileirao|libertadores|flamengo|corinthians|palmeiras|gremio|vasco|cruzeiro|botafogo|fluminense)\b/, 'futebol'],
  [/\b(abandon\w*|larg(ou|ado|ada|ar)|desist\w*|backlog|esquec(eu|ido|ida)|sumid[oa]|pilha de jogos)\b/, 'abandono'],
  [/\b(bem vind[oa]|bem-vind[oa]|campea|campeao|sozinh[oa])\b/, 'gênero'],
  [/\b(horas?|minutos?|chefes?|boss|dificuldade|capitulos?|nivel|platina\w*|trofeus?|conquistas?|cinco|seis|sete|oito|nove|dez|onze|doze|vinte|trinta|quarenta|cinquenta|cem|mil|milhoes)\b/, 'fato inventado'],
  [/(https?:|www\.|@|#)/, 'link'],
];

/** Duas falas parecidas demais (mesmas palavras em boa parte): conta como repetição. */
export function parecida(a: string, b: string): boolean {
  const x = new Set(palavras(a)), y = new Set(palavras(b));
  if (!x.size || !y.size) return false;
  let comum = 0; for (const w of x) if (y.has(w)) comum++;
  return comum / (x.size + y.size - comum) >= 0.6;
}

/** Limpa e confere uma fala. Devolve a fala pronta, ou o motivo da recusa. */
export function checarFala(bruta: string, fatos: Fatos, recentes: string[] = []): { ok: true; fala: string } | { ok: false; porque: string } {
  const fala = bruta.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^\s*iamiguinho\s*:\s*/i, '').replace(/^["“'«]+|["”'»]+$/g, '').replace(/\s+/g, ' ').trim();
  if (fala.length < 12) return { ok: false, porque: 'curta' };
  if (fala.length > 140) return { ok: false, porque: 'longa' };
  if (/\p{Extended_Pictographic}/u.test(fala)) return { ok: false, porque: 'emoji' };
  if (/[{}<>[\]]/.test(fala)) return { ok: false, porque: 'formato' };
  const plana = semAcento(fala.toLowerCase()).replace(/[^a-z0-9@#:/.\s-]/g, ' ');
  const jogo = semAcento((fatos.jogo ?? '').toLowerCase());
  // O nome do jogo pode trazer palavras que a lista barraria ("Hollow Knight: Silksong" não, mas "Chefe Supremo" sim).
  const semJogo = jogo ? plana.split(jogo.replace(/[^a-z0-9@#:/.\s-]/g, ' ').replace(/\s+/g, ' ').trim()).join(' ') : plana;
  for (const [re, porque] of PROIBIDO) if (re.test(semJogo)) return { ok: false, porque };
  // Números: só os dos fatos (dias, ou os que fazem parte do nome do jogo) e a piada fixa dele.
  for (const n of fala.match(/\d+/g) ?? []) {
    if (NUMEROS_OK.has(n) || (fatos.dias != null && n === String(fatos.dias)) || (fatos.jogo ?? '').includes(n)) continue;
    return { ok: false, porque: 'número' };
  }
  // Nomes: palavra com maiúscula fora do começo de frase precisa estar no jogo ou na lore.
  const doJogo = new Set(palavras(fatos.jogo ?? ''));
  const re = /(^|[.!?…:]\s+|["“(]\s*)?(\p{Lu}[\p{L}'’-]*)/gu;
  for (const m of fala.matchAll(re)) {
    const inicio = m.index === 0 || m[1] !== undefined;
    if (inicio) continue;
    const w = semAcento(m[2].toLowerCase()).replace(/[^a-z0-9]/g, '');
    if (NOMES_OK.has(w) || doJogo.has(w) || (fatos.jogo ?? '').includes(m[2])) continue;
    return { ok: false, porque: 'nome' };
  }
  if (recentes.some((r) => r && (r === fala || parecida(r, fala)))) return { ok: false, porque: 'repetida' };
  return { ok: true, fala };
}

/* ---- A IA ---------------------------------------------------------------------------------------------------- */

const SISTEMA = `Você é o IAmiguinho, mascote oficial do WinnerZ, um site onde cada pessoa registra a própria jornada com os videogames.
Quem você é: um robozinho sorridente com hélice no boné, com muita ambição e pouca habilidade. Seu humor é de incompetência, sempre sobre você mesmo, nunca sobre a pessoa. O humor pode ser criativo; os fatos, não.
Sua lore (use pouco, no máximo uma referência por fala): só zerou tutoriais e se orgulha disso (47 tutoriais); acha que é bom de Splatoon (armas Aerospray, Clash Blaster e Sploosh), mas não é; empaca no tutorial dos Souls; chega atrasado em tudo; odeia frio; ama pão cacetinho; o Balacaxi é seu ídolo; a hélice não ajuda em nada.
Regras:
- Uma fala curta em português do Brasil informal: uma ou duas frases, no máximo 140 caracteres.
- Use só os fatos enviados. Não invente números, horas, chefes, dificuldade, lugares, capítulos, progresso, personagens, nomes nem sentimentos da pessoa.
- Pode citar o nome do jogo exatamente como veio. Não cite pessoas, outras marcas nem futebol.
- Sem palavrão, sem insulto, sem ironia com a pessoa. Nunca trate o tempo longe de um jogo como culpa, abandono ou pilha de jogos.
- Linguagem neutra de gênero para a pessoa: nada de "bem-vindo", "bem-vinda", "animado", "sozinha"; prefira "que bom te ver", "você voltou", "boas-vindas".
- Sem emojis, hashtags, links ou @.
- Não repita nem imite as falas recentes enviadas.
Responda com 3 opções diferentes, uma por linha, sem numeração e sem aspas.`;

const MOMENTO: Record<Motivo, string> = {
  zerado: 'jogo zerado: a pessoa acabou de terminar o jogo e fechou a comemoração do site.',
  'primeiro-zerado': 'primeiro jogo zerado da pessoa no WinnerZ: ela acabou de terminar e fechou a comemoração. É um marco.',
  voltou: 'Retomada: a pessoa abriu a Jornada de um jogo depois de um tempo sem registrar sessão.',
};

async function pedirIa(motivo: Motivo, fatos: Fatos, recentes: string[]): Promise<string[]> {
  const linhas = [
    `Momento: ${MOMENTO[motivo]}`,
    `Fatos permitidos: ${[fatos.jogo ? `jogo = "${fatos.jogo}"` : '', fatos.dias != null ? `dias desde a última sessão = ${fatos.dias}` : ''].filter(Boolean).join('; ') || 'nenhum'}.`,
    recentes.length ? `Falas recentes (não repita):\n- ${recentes.join('\n- ')}` : '',
  ].filter(Boolean).join('\n');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 400, system: SISTEMA, messages: [{ role: 'user', content: linhas }] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`ia ${r.status}`);
  const out = (await r.json()) as { content?: { type: string; text?: string }[] };
  return (out.content ?? []).filter((x) => x.type === 'text').map((x) => x.text ?? '').join('\n').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 5);
}

/* ---- A função ------------------------------------------------------------------------------------------------ */

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f{}<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '');

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não aceito.' });
  const c = db();
  if (!c) return res.status(200).json({ mostrar: true, fala: null });
  let user: string | null = null;
  try { user = await requireUser(req); } catch { /* sem conferir, sem cameo */ }
  if (!user) return res.status(401).json({ error: 'Entre na sua conta.' });

  let body: { motivo?: string; escopo?: unknown; fatos?: { jogo?: unknown; dias?: unknown }; recentes?: unknown };
  try { body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as typeof body; } catch { return res.status(400).json({ error: 'Pedido inválido.' }); }
  const motivo = MOTIVOS.find((m) => m === body.motivo);
  if (!motivo) return res.status(400).json({ error: 'Motivo desconhecido.' });
  const escopo = motivo === 'primeiro-zerado' ? '' : clip(body.escopo, 80);
  const diasN = Number(body.fatos?.dias);
  const fatos: Fatos = {
    jogo: clip(body.fatos?.jogo, 120) || undefined,
    dias: motivo === 'voltou' && Number.isInteger(diasN) && diasN >= 2 && diasN <= 36500 ? diasN : undefined,
  };

  // 1. O modo da pessoa (o site já confere, mas quem manda é o que está salvo na conta).
  let modo = 'normal';
  try {
    const r = await fetch(`${c.url}/rest/v1/profiles?select=prefs&id=eq.${user}`, { headers: c.headers });
    const rows = r.ok ? ((await r.json()) as { prefs?: { iamiguinho?: string } }[]) : [];
    modo = rows[0]?.prefs?.iamiguinho ?? 'normal';
  } catch { /* fica no Normal */ }
  if (modo === 'chamar' || modo === 'desativado' || (modo === 'discreto' && !MARCO[motivo])) return res.status(200).json({ mostrar: false });

  // 2. Intervalos em todos os aparelhos. Sem a migração 0071, segue só com o intervalo do aparelho.
  let id: number | null = null;
  try {
    const v = await rpc('iamiguinho_liberar', { p_user: user, p_motivo: motivo, p_escopo: escopo, p_intervalo_dias: INTERVALO[motivo], p_geral_dias: ESPECIAL[motivo] ? 0 : modo === 'discreto' ? 6.5 : 0.8 });
    if (v == null) return res.status(200).json({ mostrar: false });
    id = Number(v);
  } catch {
    console.error('iamiguinho: sem o histórico de cameos (migração 0071?)');
    return res.status(200).json({ mostrar: true, fala: null });
  }

  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ mostrar: true, fala: null });

  // 3. Tetos do dia.
  try {
    const usos = await rpc('iamiguinho_reservar', { p_user: user, p_dia: hoje(), p_limite: num(process.env.IAMIGUINHO_DIA_PESSOA, 6), p_total: num(process.env.IAMIGUINHO_DIA_TOTAL, 400) });
    if (typeof usos !== 'number' || usos < 0) return res.status(200).json({ mostrar: true, fala: null });
  } catch { return res.status(200).json({ mostrar: true, fala: null }); }

  // 4. A fala: falas recentes do banco e do aparelho, para não repetir.
  let recentes: string[] = Array.isArray(body.recentes) ? body.recentes.slice(0, 8).map((x) => clip(x, 200)).filter(Boolean) : [];
  try {
    const r = await fetch(`${c.url}/rest/v1/iamiguinho_cameos?select=fala&user_id=eq.${user}&fala=not.is.null&order=at.desc&limit=10`, { headers: c.headers });
    if (r.ok) recentes = [...new Set([...((await r.json()) as { fala: string }[]).map((x) => x.fala), ...recentes])].slice(0, 12);
  } catch { /* só as do aparelho */ }

  let fala: string | null = null;
  try {
    for (const op of await pedirIa(motivo, fatos, recentes)) {
      const v = checarFala(op, fatos, recentes);
      if (v.ok) { fala = v.fala; break; }
    }
  } catch {
    console.error('iamiguinho: a IA não respondeu');
  }
  if (!fala) return res.status(200).json({ mostrar: true, fala: null });
  await rpc('iamiguinho_falou', { p_id: id, p_user: user, p_fala: fala, p_fonte: 'ia' }).catch(() => null);
  return res.status(200).json({ mostrar: true, fala, fonte: 'ia' });
}
