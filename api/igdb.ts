/**
 * Função da Vercel que conversa com o IGDB.
 * As credenciais da Twitch ficam só aqui no servidor.
 *
 *   GET /api/igdb?q=elden           → busca (até 12 resultados)
 *   GET /api/igdb?id=119133         → ficha completa; também grava no cache "games" do Supabase
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

async function cacheGame(row: Record<string, unknown>) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/games?on_conflict=id`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row),
  });
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
      const [g] = await igdb('games', `where id = ${id}; fields name,slug,summary,storyline,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,platforms.name,genres.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,release_dates.date,release_dates.platform.name; limit 1;`);
      if (!g) return res.status(404).json({ error: 'Jogo não encontrado no IGDB' });
      const dev = (g.involved_companies ?? []).find((c: any) => c.developer)?.company?.name;
      const pub = (g.involved_companies ?? []).find((c: any) => c.publisher)?.company?.name;
      const backdropId = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id;
      const game = {
        id: g.slug, igdb_id: g.id, slug: g.slug, title: g.name,
        cover: image(g.cover?.image_id), backdrop: image(backdropId, 't_1080p') || null,
        year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
        developer: dev ?? null, publisher: pub ?? null,
        platforms: (g.platforms ?? []).map((p: any) => p.name),
        genres: (g.genres ?? []).map((x: any) => x.name).join(', ') || null,
        summary: g.storyline || g.summary || null,
        summary_source: 'Texto do IGDB',
        releases: (g.release_dates ?? []).filter((r: any) => r.date).slice(0, 6).map((r: any) => ({ platform: r.platform?.name ?? '', date: fmtDate(r.date) })),
        screenshots: (g.screenshots ?? []).slice(0, 6).map((s: any) => image(s.image_id, 't_screenshot_big')),
        updated_at: new Date().toISOString(),
      };
      await cacheGame(game);
      res.setHeader('Cache-Control', 's-maxage=86400');
      return res.status(200).json(game);
    }

    return res.status(400).json({ error: 'Use ?q= para buscar ou ?id= para a ficha' });
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Falha ao consultar o IGDB' });
  }
}
