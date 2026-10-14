// Backup dos arquivos do Storage do Supabase (fotos dos momentos, avatares e capas do perfil).
// Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/backup-storage.mjs <pasta-de-saída>
// Roda no GitHub Actions (workflow "Backup semanal"). Não imprime nomes de arquivos: o log do repositório é público.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const out = process.argv[2] ?? 'storage';
if (!url || !key) { console.log('Sem SUPABASE_URL/SUPABASE_SECRET_KEY: arquivos do Storage ficam fora deste backup.'); process.exit(0); }

// Chaves novas (sb_secret_...) vão só no cabeçalho apikey; a antiga service_role também aceita Bearer.
const headers = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }) };

async function json(path, init = {}) {
  const r = await fetch(`${url}${path}`, { ...init, headers: { ...headers, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path.split('?')[0].replace(/\/object\/list\/.*/, '/object/list')}: ${r.status}`);
  return r.json();
}

/** Lista tudo de um bucket, entrando nas pastas (as entradas sem id são pastas). */
async function listAll(bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await json(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, { method: 'POST', body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) });
    for (const it of page) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id == null) files.push(...(await listAll(bucket, path)));
      else files.push({ path, size: it.metadata?.size ?? 0 });
    }
    if (page.length < 1000) break;
  }
  return files;
}

const buckets = await json('/storage/v1/bucket');
let total = 0, bytes = 0, failed = 0;
for (const b of buckets) {
  const files = await listAll(b.id);
  let n = 0;
  for (const f of files) {
    const r = await fetch(`${url}/storage/v1/object/authenticated/${encodeURIComponent(b.id)}/${f.path.split('/').map(encodeURIComponent).join('/')}`, { headers });
    if (!r.ok) { failed++; continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const dest = join(out, b.id, ...f.path.split('/'));
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    n++; bytes += buf.length;
  }
  total += n;
  console.log(`${b.id}: ${n} de ${files.length} arquivos`);
}
console.log(`Storage: ${total} arquivos, ${(bytes / 1024 / 1024).toFixed(1)} MB${failed ? `, ${failed} falharam` : ''}.`);
if (failed) process.exitCode = 1;
