/**
 * "Baixar tudo" (LGPD): um .zip com tudo o que a pessoa registrou no WinnerZ.
 *  - dados.json: conta, preferências, coleção, desejos, Jornadas, Histórias, sessões, registros e análises;
 *  - colecao.csv: a estante em planilha (abre no Excel e no Google Planilhas);
 *  - fotos/: as fotos dos momentos e pontos para voltar, com o nome do registro;
 *  - comunidade: postagens, respostas, comunidades, clubes e reações (vem do servidor; as imagens em fotos/comunidade/).
 */
import type { State } from '../data/types';
import { makeZip, type ZipEntry } from './zip';

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (n?: number) => (n == null ? '' : n.toFixed(2).replace('.', ','));

export function hardwareCsv(s: State): string {
  const head = ['Tipo', 'Nome', 'Plataforma', 'Modelo', 'Edição', 'Região', 'Estado', 'Itens', 'Série', 'Origem', 'Comprado em', 'Onde', 'Preço pago', 'Nota'];
  const kind = { console: 'Console', portatil: 'Portátil', acessorio: 'Acessório' } as const;
  const rows = (s.hardware ?? []).map((h) => [kind[h.kind], h.name, h.platform, h.model, h.edition, h.region, h.condition, h.items, h.serial, h.origin, h.purchasedOn, h.purchasePlace, money(h.pricePaid), h.note]);
  return '\ufeff' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export function collectionCsv(s: State): string {
  const head = ['Jogo', 'Ano', 'Plataforma', 'Tipo', 'Edição', 'Região', 'Condição', 'Caixa', 'Itens', 'Origem', 'Comprado em', 'Onde', 'Preço pago', 'Preço atual', 'Especial', 'Nota'];
  const rows = s.copies.map((c) => {
    const g = s.games[c.gameId];
    return [g?.title ?? c.gameId, g?.year ?? '', c.platform, c.kind, c.edition, c.region, c.condition, c.boxCondition, c.items, c.origin, c.purchasedOn, c.purchasePlace, money(c.pricePaid), money(c.priceNow), c.special ? 'sim' : '', c.note];
  });
  // Ponto e vírgula e BOM: o Excel em português abre com acentos e colunas certas.
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 50) || 'registro';

export function exportJson(s: State, photoNames: Record<string, string>, comunidade: Record<string, unknown> | null = null) {
  const gameIds = new Set<string>([...s.copies.map((c) => c.gameId), ...s.wishes.map((w) => w.gameId), ...s.favorites, ...s.journeys.map((j) => j.gameId), ...Object.keys(s.myGames), ...s.reviews.filter((r) => r.mine).map((r) => r.gameId)]);
  const { overlayNonce: _secret, ...prefs } = s.prefs;
  return {
    sobre: 'Seus dados no WinnerZ. As fotos estão na pasta fotos/ deste arquivo; cada registro com foto aponta para ela em "fotoArquivo".',
    exportadoEm: new Date().toISOString(),
    conta: s.profile ? { nome: s.profile.name } : null,
    preferencias: prefs,
    jogos: [...gameIds].map((id) => s.games[id]).filter(Boolean).map((g) => ({ id: g.id, titulo: g.title, ano: g.year, igdb: g.igdbId ?? null })),
    colecao: s.copies,
    desejos: s.wishes,
    favoritos: s.favorites,
    consoles: s.hardware ?? [],
    meusJogos: Object.values(s.myGames),
    jornadas: s.journeys,
    historias: s.histories,
    sessoes: s.sessions,
    registros: s.events.map(({ image: _url, ...e }) => ({ ...e, fotoArquivo: photoNames[e.id] ?? null })),
    analises: s.reviews.filter((r) => r.mine).map(({ author: _a, ...r }) => r),
    emprestimos: s.loans ?? [],
    vitrines: s.showcases ?? [],
    museu: { ...(s.museum ?? {}), salas: (s.rooms ?? []).map((r) => ({ ...r, pieces: r.pieces.map((p) => (p.t === 'f' ? { t: 'f', id: p.id, caption: p.caption, fotoArquivo: photoNames[p.id] ?? null } : p)) })) },
    comunidade: comunidade ? withPhotoFiles(comunidade, photoNames) : null,
  };
}

/** Nas postagens e respostas, cada imagem aponta também para o arquivo dentro do .zip. */
function withPhotoFiles(c: Record<string, unknown>, names: Record<string, string>): Record<string, unknown> {
  const fix = (list: unknown) => (Array.isArray(list) ? list.map((x: Record<string, unknown>) => ({ ...x, imagensArquivos: Array.isArray(x.imagens) ? (x.imagens as string[]).map((i) => names[`c:${i}`] ?? null) : [] })) : list);
  return { ...c, postagens: fix(c.postagens), respostas: fix(c.respostas), mensagensNosClubes: fix(c.mensagensNosClubes) };
}

/** As imagens que a pessoa pôs nas conversas (caminho no armazenamento ou a própria imagem, na demonstração). */
function communityImages(c: Record<string, unknown> | null): string[] {
  if (!c) return [];
  const out: string[] = [];
  for (const k of ['postagens', 'respostas', 'mensagensNosClubes']) {
    const l = c[k];
    if (Array.isArray(l)) l.forEach((x: Record<string, unknown>) => { if (Array.isArray(x.imagens)) out.push(...(x.imagens as string[])); });
  }
  return [...new Set(out)];
}

/** Monta o .zip. Fotos que não baixarem (rede) ficam de fora e entram na lista de avisos. */
export async function buildExport(s: State, onProgress?: (done: number, total: number) => void, comunidade: Record<string, unknown> | null = null, imageUrl: (path: string) => string | null = (x) => x): Promise<{ blob: Blob; missing: number }> {
  // Fotos dos momentos, as fotos penduradas no Museu e as imagens das conversas.
  const withPhoto: { id: string; image: string; at: string; title: string; dir?: string }[] = [
    ...s.events.filter((e) => e.image).map((e) => ({ id: e.id, image: e.image!, at: e.at, title: e.title })),
    ...(s.rooms ?? []).flatMap((r) => r.pieces.flatMap((p) => (p.t === 'f' && p.image ? [{ id: p.id, image: p.image, at: r.createdAt ?? new Date().toISOString(), title: `museu ${r.title}` }] : []))),
    ...communityImages(comunidade).flatMap((path, i) => { const url = imageUrl(path); return url ? [{ id: `c:${path}`, image: url, at: new Date().toISOString(), title: `imagem ${i + 1}`, dir: 'comunidade/' }] : []; }),
  ];
  const files: ZipEntry[] = [];
  const names: Record<string, string> = {};
  let missing = 0, done = 0;
  for (const e of withPhoto) {
    try {
      const r = await fetch(e.image);
      if (!r.ok) throw new Error();
      const buf = new Uint8Array(await r.arrayBuffer());
      const ext = (r.headers.get('content-type') ?? '').includes('png') ? 'png' : (r.headers.get('content-type') ?? '').includes('webp') ? 'webp' : 'jpg';
      const name = e.dir ? `fotos/${e.dir}${slug(e.title)}-${slug(e.id.slice(-12))}.${ext}` : `fotos/${e.at.slice(0, 10)}-${slug(e.title)}-${e.id.slice(0, 6)}.${ext}`;
      names[e.id] = name;
      files.push({ name, data: buf });
    } catch { missing++; }
    onProgress?.(++done, withPhoto.length);
  }
  files.unshift(
    { name: 'dados.json', data: JSON.stringify(exportJson(s, names, comunidade), null, 2) },
    { name: 'colecao.csv', data: collectionCsv(s) },
    ...((s.hardware ?? []).length ? [{ name: 'consoles.csv', data: hardwareCsv(s) }] : []),
    { name: 'LEIA-ME.txt', data: 'Seus dados no WinnerZ.\r\n\r\ndados.json: tudo o que você registrou, em formato aberto.\r\ncolecao.csv: sua estante em planilha (Excel ou Google Planilhas).\r\nconsoles.csv: consoles, portáteis e acessórios.\r\nfotos/: as fotos dos seus momentos, pontos para voltar e do seu Museu; em fotos/comunidade/, as imagens que você pôs nas conversas.\r\n' },
  );
  return { blob: makeZip(files), missing };
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
