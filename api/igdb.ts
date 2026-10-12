/**
 * Função da Vercel que conversa com o IGDB.
 * As credenciais da Twitch ficam só aqui no servidor.
 *
 *   GET /api/igdb?q=elden           → busca (até 12 resultados)
 *   GET /api/igdb?id=119133         → ficha completa; também grava no cache "games" do Supabase
 *
 * A sinopse é traduzida para o português uma vez, aqui, e fica guardada no banco.
 *   - DEEPL_API_KEY (opcional, melhor qualidade; o plano gratuito da DeepL dá 500 mil caracteres/mês)
 *   - sem chave: MyMemory, gratuito (TRANSLATE_EMAIL opcional aumenta o limite diário)
 * Gêneros, temas e modos são traduzidos por dicionário no site (src/lib/igdbPt.ts).
 */

type Req = { query: Record<string, string | string[] | undefined>; method?: string };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

let token: { value: string; expires: number } | null = null;

async function getToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET não configurados');
  const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: 'POST' });
  if (!r.ok) throw new Error(`Twitch respondeu ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return token.value;
}

async function igdb(endpoint: string, body: string) {
  const r = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'text/plain' },
    body,
  });
  if (!r.ok) throw new Error(`IGDB respondeu ${r.status}`);
  return r.json() as Promise<any[]>;
}

const image = (id?: string, size = 't_cover_big') => (id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : '');
const fmtDate = (unix?: number) => (unix ? new Date(unix * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');


/* ------------------------------------------------------------------ */
/* Tradução da sinopse                                                 */
/* ------------------------------------------------------------------ */

async function deepl(text: string, key: string): Promise<string | null> {
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const r = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: [text], source_lang: 'EN', target_lang: 'PT-BR' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { translations?: { text: string }[] };
  return j.translations?.[0]?.text ?? null;
}

/** Quebra em pedaços de até ~450 bytes sem cortar frases (limite do MyMemory é 500). */
function chunks(text: string, max = 450): string[] {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  const bytes = (x: string) => new TextEncoder().encode(x).length;
  for (const s of sentences) {
    if (bytes(cur + s) > max && cur) { out.push(cur.trim()); cur = ''; }
    if (bytes(s) > max) {
      for (const w of s.split(' ')) { if (bytes(cur + w + ' ') > max && cur) { out.push(cur.trim()); cur = ''; } cur += w + ' '; }
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function mymemory(text: string): Promise<string | null> {
  const email = process.env.TRANSLATE_EMAIL ? `&de=${encodeURIComponent(process.env.TRANSLATE_EMAIL)}` : '';
  const parts = await Promise.all(chunks(text).map(async (c) => {
    const r = await fetch(`https://api.mymemory.translated.net/get?langpair=en|pt-BR${email}&q=${encodeURIComponent(c)}`, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { responseStatus?: number | string; responseData?: { translatedText?: string } };
    const t = j.responseData?.translatedText ?? '';
    if (Number(j.responseStatus) !== 200 || !t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) return null;
    return t;
  }));
  return parts.every(Boolean) ? parts.join(' ') : null;
}

async function toPortuguese(text: string): Promise<string | null> {
  try {
    const key = process.env.DEEPL_API_KEY;
    if (key) { const t = await deepl(text, key); if (t) return t; }
    return await mymemory(text);
  } catch {
    return null;
  }
}

const NEW_COLUMNS = ['summary_original', 'artworks', 'videos', 'themes', 'modes'];

async function cacheGame(row: Record<string, unknown>) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const send = (body: Record<string, unknown>) => fetch(`${url}/rest/v1/games?on_conflict=id`, {
    method: 'POST',
    // Chaves novas (sb_secret_...) vão só no cabeçalho apikey; a antiga service_role também aceita Bearer.
    headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(body),
  });
  const r = await send(row);
  // Banco ainda sem as colunas novas (migração 0002 não rodada): guarda o que der.
  if (r.status === 400) await send(Object.fromEntries(Object.entries(row).filter(([k]) => !NEW_COLUMNS.includes(k))));
}

export default async function handler(req: Req, res: Res) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const id = typeof req.query.id === 'string' ? Number(req.query.id) : NaN;

    if (q) {
      const safe = q.replace(/"/g, '');
      const rows = await igdb('games', `search "${safe}"; fields name,slug,first_release_date,cover.image_id,platforms.name; limit 12;`);
      res.setHeader('Cache-Control', 's-maxage=3600');
      return res.status(200).json(rows.map((g) => ({
        igdbId: g.id, slug: g.slug, title: g.name,
        year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : undefined,
        cover: image(g.cover?.image_id), platforms: (g.platforms ?? []).map((p: any) => p.name),
      })));
    }

    if (Number.isFinite(id)) {
      const [g] = await igdb('games', `where id = ${id}; fields name,slug,summary,storyline,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,videos.video_id,videos.name,platforms.name,genres.name,themes.name,game_modes.name,player_perspectives.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,release_dates.date,release_dates.platform.name; limit 1;`);
      if (!g) return res.status(404).json({ error: 'Jogo não encontrado no IGDB' });
      const dev = (g.involved_companies ?? []).find((c: any) => c.developer)?.company?.name;
      const pub = (g.involved_companies ?? []).find((c: any) => c.publisher)?.company?.name;
      const backdropId = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id;
      // A sinopse curta é melhor que o "storyline", que costuma ser longo e cheio de spoiler.
      const original: string | null = g.summary || g.storyline || null;
      const translated = original ? await toPortuguese(original) : null;
      // Uma data por plataforma: a primeira em que o jogo saiu nela.
      const firstByPlatform = new Map<string, number>();
      for (const r of g.release_dates ?? []) {
        const name = r.platform?.name; if (!name || !r.date) continue;
        if (!firstByPlatform.has(name) || r.date < firstByPlatform.get(name)!) firstByPlatform.set(name, r.date);
      }
      const game = {
        id: g.slug, igdb_id: g.id, slug: g.slug, title: g.name,
        cover: image(g.cover?.image_id), backdrop: image(backdropId, 't_1080p') || null,
        year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
        developer: dev ?? null, publisher: pub ?? null,
        platforms: (g.platforms ?? []).map((p: any) => p.name),
        genres: (g.genres ?? []).map((x: any) => x.name).join(', ') || null,
        themes: (g.themes ?? []).map((x: any) => x.name),
        modes: [...(g.game_modes ?? []), ...(g.player_perspectives ?? [])].map((x: any) => x.name),
        summary: translated ?? original,
        summary_original: translated ? original : null,
        summary_source: translated ? 'Texto do IGDB, traduzido automaticamente' : 'Texto do IGDB, em inglês',
        releases: [...firstByPlatform].sort((a, b) => a[1] - b[1]).slice(0, 8).map(([platform, date]) => ({ platform, date: fmtDate(date) })),
        screenshots: (g.screenshots ?? []).slice(0, 16).map((s: any) => image(s.image_id, 't_screenshot_big')),
        artworks: (g.artworks ?? []).slice(0, 8).map((s: any) => image(s.image_id, 't_screenshot_big')),
        videos: (g.videos ?? []).filter((v: any) => v.video_id).slice(0, 8).map((v: any) => ({ id: v.video_id, name: v.name ?? '' })),
        updated_at: new Date().toISOString(),
      };
      await cacheGame(game);
      // Sem tradução (limite gratuito do dia, por exemplo), cacheia por pouco tempo para tentar de novo.
      res.setHeader('Cache-Control', translated || !original ? 's-maxage=86400' : 's-maxage=600');
      return res.status(200).json(game);
    }

    return res.status(400).json({ error: 'Use ?q= para buscar ou ?id= para a ficha' });
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Falha ao consultar o IGDB' });
  }
}
