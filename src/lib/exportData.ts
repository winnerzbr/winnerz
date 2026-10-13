/**
 * "Baixar tudo" (LGPD): um .zip com tudo o que a pessoa registrou no WinnerZ.
 *  - dados.json: conta, preferências, coleção, desejos, Jornadas, Histórias, sessões, registros e análises;
 *  - colecao.csv: a estante em planilha (abre no Excel e no Google Planilhas);
 *  - fotos/: as fotos dos momentos e pontos para voltar, com o nome do registro.
 */
import type { State } from '../data/types';
import { makeZip, type ZipEntry } from './zip';

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (n?: number) => (n == null ? '' : n.toFixed(2).replace('.', ','));

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

export function exportJson(s: State, photoNames: Record<string, string>) {
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
    meusJogos: Object.values(s.myGames),
    jornadas: s.journeys,
    historias: s.histories,
    sessoes: s.sessions,
    registros: s.events.map(({ image: _url, ...e }) => ({ ...e, fotoArquivo: photoNames[e.id] ?? null })),
    analises: s.reviews.filter((r) => r.mine).map(({ author: _a, ...r }) => r),
  };
}

/** Monta o .zip. Fotos que não baixarem (rede) ficam de fora e entram na lista de avisos. */
export async function buildExport(s: State, onProgress?: (done: number, total: number) => void): Promise<{ blob: Blob; missing: number }> {
  const withPhoto = s.events.filter((e) => e.image);
  const files: ZipEntry[] = [];
  const names: Record<string, string> = {};
  let missing = 0, done = 0;
  for (const e of withPhoto) {
    try {
      const r = await fetch(e.image!);
      if (!r.ok) throw new Error();
      const buf = new Uint8Array(await r.arrayBuffer());
      const ext = (r.headers.get('content-type') ?? '').includes('png') ? 'png' : (r.headers.get('content-type') ?? '').includes('webp') ? 'webp' : 'jpg';
      const name = `fotos/${e.at.slice(0, 10)}-${slug(e.title)}-${e.id.slice(0, 6)}.${ext}`;
      names[e.id] = name;
      files.push({ name, data: buf });
    } catch { missing++; }
    onProgress?.(++done, withPhoto.length);
  }
  files.unshift(
    { name: 'dados.json', data: JSON.stringify(exportJson(s, names), null, 2) },
    { name: 'colecao.csv', data: collectionCsv(s) },
    { name: 'LEIA-ME.txt', data: 'Seus dados no WinnerZ.\r\n\r\ndados.json: tudo o que você registrou, em formato aberto.\r\ncolecao.csv: sua estante em planilha (Excel ou Google Planilhas).\r\nfotos/: as fotos dos seus momentos e pontos para voltar.\r\n' },
  );
  return { blob: makeZip(files), missing };
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
