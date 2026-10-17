/**
 * Gera as artes: node art/figurinhas/render.mjs p01 [p02 ...]
 * Cada página exporta `stickers`: [{ file, draw() -> svg }]. Sai em public/figurinhas/t1/<file>.webp (600 por 840)
 * e numa folha de contato em art/figurinhas/out/<página>.png para conferir.
 * Precisa do Playwright (Chromium) e do Python com Pillow para o webp.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PW = process.env.PLAYWRIGHT_MODULE || '/opt/npm-tools/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const outDir = join(here, 'out'); const pub = join(here, '../../public/figurinhas/t1');
mkdirSync(outDir, { recursive: true }); mkdirSync(pub, { recursive: true });

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 500, height: 700 }, deviceScaleFactor: 1.2 });
for (const name of process.argv.slice(2)) {
  const { stickers } = await import(join(here, 'pages', `${name}.mjs`));
  const pngs = [];
  for (const s of stickers) {
    const svg = s.draw();
    writeFileSync(join(outDir, `${s.file}.svg`), svg);
    await pg.setContent(`<!doctype html><html><body style="margin:0;background:#000">${svg}</body></html>`);
    await pg.waitForTimeout(60);
    const raw = join(outDir, `${s.file}.raw.png`), png = join(outDir, `${s.file}.png`);
    await pg.screenshot({ path: raw, clip: { x: 0, y: 0, width: 500, height: 700 } });
    const e = s.engrave === false ? null : { period: 4.2, alpha: 0.5, ...(s.engrave || {}) };
    if (e) execFileSync('python3', [join(here, 'engrave.py'), raw, png, String(e.period), String(e.alpha)]);
    else execFileSync('cp', [raw, png]);
    pngs.push(png);
  }
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
pub, sheet, files = sys.argv[1], sys.argv[2], sys.argv[3:]
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); ims.append(im)
    im.save(pub + '/' + f.split('/')[-1][:-4] + '.webp', 'WEBP', quality=86, method=6)
w, h = 300, 420
sh = Image.new('RGB', (w * min(6, len(ims)) + 10 * (min(6, len(ims)) - 1), h * ((len(ims) + 5) // 6) + 10 * ((len(ims) - 1) // 6)), (12, 12, 14))
for i, im in enumerate(ims):
    sh.paste(im.resize((w, h), Image.LANCZOS), ((i % 6) * (w + 10), (i // 6) * (h + 10)))
sh.save(sheet)
`, pub, join(outDir, `${name}.png`), ...pngs]);
  console.log(`${name}: ${stickers.length} artes`);
}
await b.close();
