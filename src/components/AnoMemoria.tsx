/**
 * Etapa 8 da revisão, na retrospectiva do ano:
 * - AnoCalendario: os dias jogados no ano, um mês por linha e um quadradinho por dia (mais claro = mais tempo).
 * - CartaoDoAno: uma imagem no tamanho dos stories (1080 × 1920) com os números do ano, para baixar ou compartilhar.
 */
import { useMemo, useState } from 'react';
import type { State } from '../data/types';
import type { YearReview } from '../lib/yearReview';
import { durLabel } from '../lib/format';
import { track } from '../lib/track';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const chave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function AnoCalendario({ s, year }: { s: State; year: number }) {
  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of s.sessions) {
      const d = new Date(x.startedAt);
      if (d.getFullYear() !== year) continue;
      const k = chave(d); m.set(k, (m.get(k) ?? 0) + Math.max(1, x.minutes ?? 1));
    }
    return m;
  }, [s.sessions, year]);
  const hoje = new Date();
  let total = 0;
  const meses = MESES.map((nome, mi) => {
    const dias = new Date(year, mi + 1, 0).getDate();
    let n = 0;
    const cells = Array.from({ length: 31 }, (_, i) => {
      if (i >= dias) return { k: i, cls: 'is-none', t: '' };
      const d = new Date(year, mi, i + 1);
      const min = porDia.get(chave(d));
      if (min) n++;
      const futuro = d > hoje;
      const nivel = !min ? '' : min < 60 ? ' is-1' : min < 120 ? ' is-2' : ' is-3';
      return { k: i, cls: `${futuro ? 'is-fut' : ''}${nivel}${chave(d) === chave(hoje) ? ' is-today' : ''}`, t: `${i + 1} de ${nome}${min ? `: ${durLabel(min)}` : ''}` };
    });
    total += n;
    const futuro = new Date(year, mi, 1) > hoje;
    return { nome, cells, n, futuro };
  });
  if (!total) return null;
  return (
    <section className="card yrv__box acal" aria-labelledby="acal-h">
      <div className="acal__head"><h2 id="acal-h" className="kicker">Dias jogados em {year}</h2><span className="muted">{total} {total === 1 ? 'dia' : 'dias'} · cada linha é um mês, cada quadradinho um dia</span></div>
      <div className="acal__grid" role="img" aria-label={`${total} dias jogados em ${year}: ${meses.filter((m) => m.n).map((m) => `${m.nome}, ${m.n}`).join('; ')}`}>
        <span />
        {Array.from({ length: 31 }, (_, i) => <span key={i} className="acal__col">{[1, 10, 20, 31].includes(i + 1) ? i + 1 : ''}</span>)}
        <span />
        {meses.map((m) => (
          <div key={m.nome} className={`acal__row${m.futuro ? ' is-fut' : ''}`}>
            <span className="acal__mes">{m.nome}</span>
            {m.cells.map((c) => <i key={c.k} className={`acal__d ${c.cls}`} title={c.t || undefined} />)}
            <span className="acal__n">{m.futuro ? '' : `${m.n} ${m.n === 1 ? 'dia' : 'dias'}`}</span>
          </div>
        ))}
      </div>
      <div className="jcal__leg" aria-hidden="true"><span><i className="is-1" />até 1h</span><span><i className="is-2" />1 a 2h</span><span><i className="is-3" />2h ou mais</span><span><i className="is-today" />hoje</span></div>
    </section>
  );
}

/** Carrega uma imagem para o canvas; se o servidor não liberar (CORS), segue sem ela. */
const carregar = (src?: string | null) => new Promise<HTMLImageElement | null>((ok) => {
  if (!src) return ok(null);
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => ok(img); img.onerror = () => ok(null); img.src = src;
});

async function desenhar(r: YearReview, handle?: string | null): Promise<Blob | null> {
  const W = 1080, H = 1920;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); if (!c) return null;
  try { await document.fonts.load('800 80px Archivo'); await document.fonts.load('500 30px "IBM Plex Mono"'); } catch { /* usa a fonte do sistema */ }
  c.fillStyle = '#0a0b0d'; c.fillRect(0, 0, W, H);
  const fundo = await carregar(r.top?.game.backdrop || r.top?.game.cover);
  if (fundo) {
    c.save(); c.filter = 'blur(36px) brightness(0.38)';
    const esc = Math.max(W / fundo.width, H / fundo.height) * 1.2;
    c.drawImage(fundo, (W - fundo.width * esc) / 2, (H - fundo.height * esc) / 2, fundo.width * esc, fundo.height * esc);
    c.restore();
  }
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,11,13,0.2)'); g.addColorStop(1, 'rgba(10,11,13,0.85)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const logo = await carregar('/brand/forjado.svg');
  if (logo) c.drawImage(logo, 90, 120, 150, 150 * (logo.height / logo.width || 1));
  c.fillStyle = '#F2F4F6'; c.textBaseline = 'alphabetic';
  c.font = '800 112px Archivo, sans-serif';
  const titulo = [`MEU ${r.year}`, 'NA JORNADA'];
  titulo.forEach((t, i) => c.fillText(t, 90, 520 + i * 116));
  const nums: [string, string][] = [[String(r.done.length), r.done.length === 1 ? 'jogo zerado' : 'jogos zerados'], [String(r.days), r.days === 1 ? 'dia jogado' : 'dias jogados'], [String(r.allMoments), r.allMoments === 1 ? 'momento guardado' : 'momentos guardados']];
  if (r.minutes) nums.push([durLabel(r.minutes), 'de jogo informadas']);
  nums.splice(0, nums.length, ...nums.filter(([n]) => n !== '0'));
  nums.forEach(([n, l], i) => {
    const y = 860 + i * 150;
    c.font = '800 96px Archivo, sans-serif'; c.fillStyle = '#F2F4F6'; c.fillText(n, 90, y);
    const w = c.measureText(n).width;
    c.font = '500 40px Archivo, sans-serif'; c.fillStyle = '#C9CED4'; c.fillText(l, 90 + w + 24, y);
  });
  if (r.top) {
    c.font = '500 30px "IBM Plex Mono", monospace'; c.fillStyle = '#C9CED4'; c.fillText('O JOGO DO MEU ANO', 90, 1600);
    c.font = '800 64px Archivo, sans-serif'; c.fillStyle = '#F2F4F6';
    const t = r.top.game.title.length > 26 ? `${r.top.game.title.slice(0, 25)}…` : r.top.game.title;
    c.fillText(t, 90, 1680);
  }
  c.font = '500 30px "IBM Plex Mono", monospace'; c.fillStyle = '#9AA1AA';
  c.fillText(handle ? `winnerz.com.br/@${handle}` : 'winnerz.com.br', 90, 1800);
  try { return await new Promise<Blob | null>((ok) => cv.toBlob(ok, 'image/png')); } catch { return null; }
}

export function CartaoDoAno({ r, handle }: { r: YearReview; handle?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const gerar = async () => {
    setBusy(true); setErro('');
    const b = await desenhar(r, handle);
    setBusy(false);
    if (!b) { setErro('Não consegui montar a imagem agora.'); return; }
    if (url) URL.revokeObjectURL(url);
    setBlob(b); setUrl(URL.createObjectURL(b)); track('jornada.cartao-ano');
  };
  const nome = `winnerz-${r.year}.png`;
  const podeCompartilhar = !!blob && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [new File([blob], nome, { type: 'image/png' })] });
  return (
    <section className="card yrv__box cartao" aria-labelledby="cartao-h">
      <div className="acal__head"><h2 id="cartao-h" className="kicker">Cartão do ano</h2><span className="muted">Sai como imagem, no tamanho dos stories. Só os números, nada de privado.</span></div>
      {url ? (
        <div className="cartao__prev">
          <img src={url} alt={`Cartão do seu ${r.year} na Jornada`} />
          <div className="cartao__acts">
            <a className="btn primary sm" href={url} download={nome}>Baixar a imagem</a>
            {podeCompartilhar && <button className="btn ghost sm" onClick={() => navigator.share({ files: [new File([blob!], nome, { type: 'image/png' })], title: `Meu ${r.year} na Jornada` }).catch(() => null)}>Compartilhar</button>}
            <button className="btn quiet sm" onClick={gerar}>Gerar de novo</button>
          </div>
        </div>
      ) : <button className="btn ghost" onClick={gerar} disabled={busy}>{busy ? 'Montando…' : 'Montar o cartão do ano'}</button>}
      {erro && <p className="muted" role="status">{erro}</p>}
    </section>
  );
}
