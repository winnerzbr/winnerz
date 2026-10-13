import { useEffect, useMemo, useRef, useState } from 'react';
import { actions, useStore } from '../data/store';
import type { CopyKind, Game } from '../data/types';
import { searchGames, loadGame, type Hit } from './AddGameDialog';
import { CoverArt } from './CoverArt';
import { Icon } from './Icon';
import { cleanTitle, matchPlatform, normalizeCode, platformFromText } from '../lib/recognize';
import { samePlatform, shortPlatform } from '../lib/platforms';
import { shrink, toDataUrl } from '../lib/image';
import { track } from '../lib/track';

/* ------------------------------------------------------------------------------------------------
 * Adicionar pela câmera: código de barras (câmera ao vivo, foto do código ou digitado) e foto das
 * capas lida pela IA. Tudo vira uma lista de candidatos; nada entra na coleção sem a pessoa confirmar.
 * ---------------------------------------------------------------------------------------------- */

/** Um jogo encontrado, esperando confirmação. */
export interface Found {
  key: string;
  from: 'codigo' | 'foto';
  /** O que foi lido: o código, ou o nome que a IA viu. */
  read: string;
  guess?: string;
  barcode?: string;
  confidence?: 'alta' | 'media' | 'baixa';
  note?: string;
  hits: Hit[];
  chosen: Hit | null;
  platform: string;
  kind: CopyKind;
  include: boolean;
  searching?: boolean;
}

const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';

async function authed(path: string, init: RequestInit = {}) {
  let t: string | null = null;
  try { const { accessToken } = await import('../data/supabaseAdapter'); t = await accessToken(); } catch { /* sem sessão: o servidor responde que precisa entrar */ }
  const r = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${t}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? 'Não deu certo agora. Tente de novo.');
  return j;
}

type Detect = (src: HTMLCanvasElement) => Promise<string | null>;
let detector: Promise<Detect | null> | null = null;

/** O leitor de código de barras: o do navegador (Chrome, Android) ou, sem ele, o ZXing, baixado só quando precisa. */
function getDetector(): Promise<Detect | null> {
  detector ??= (async () => {
    const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): { detect: (s: unknown) => Promise<{ rawValue: string }[]> }; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
    if (BD) {
      try {
        const want = ['ean_13', 'upc_a', 'ean_8', 'upc_e'];
        const ok = (await BD.getSupportedFormats?.()) ?? want;
        const formats = want.filter((f) => ok.includes(f));
        if (formats.length) {
          const d = new BD({ formats });
          return async (c) => (await d.detect(c))[0]?.rawValue ?? null;
        }
      } catch { /* cai para o ZXing */ }
    }
    try {
      const m = await import(/* @vite-ignore */ ZXING);
      const reader = new m.BrowserMultiFormatReader();
      return async (c) => { try { return reader.decodeFromCanvas(c).getText() as string; } catch { return null; } };
    } catch { return null; }
  })();
  return detector;
}

/** Desenha um quadro (vídeo ou imagem) num canvas pequeno, que é o que os leitores recebem. */
function frame(src: HTMLVideoElement | ImageBitmap, canvas: HTMLCanvasElement, max = 1280) {
  const w = 'videoWidth' in src ? src.videoWidth : src.width;
  const h = 'videoHeight' in src ? src.videoHeight : src.height;
  if (!w || !h) return false;
  const k = Math.min(1, max / Math.max(w, h));
  canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(src, 0, 0, canvas.width, canvas.height);
  return true;
}

/** Câmera ao vivo lendo códigos de barras, com as saídas de sempre: foto do código e digitar os números. */
export function BarcodeScan({ onCode, last }: { onCode: (code: string) => void; last?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'starting' | 'on' | 'denied' | 'nocam' | 'noreader'>('idle');
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  const recent = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const cb = useRef(onCode); cb.current = onCode;

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => stop, []);

  const found = (raw: string) => {
    const code = normalizeCode(raw);
    if (!code) return false;
    const now = Date.now();
    if (recent.current.code === code && now - recent.current.at < 4000) return true;
    recent.current = { code, at: now };
    navigator.vibrate?.(60);
    cb.current(code);
    return true;
  };

  const start = async () => {
    setErr('');
    if (!navigator.mediaDevices?.getUserMedia) { setState('nocam'); return; }
    setState('starting');
    const read = await getDetector();
    if (!read) { setState('noreader'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      stream.current = s;
      const v = video.current!;
      v.srcObject = s;
      await v.play().catch(() => null);
      setState('on');
    } catch (e) {
      const name = (e as { name?: string }).name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'nocam');
    }
  };

  useEffect(() => {
    if (state !== 'on') return;
    let busy = false, alive = true;
    canvas.current ??= document.createElement('canvas');
    const tick = async () => {
      if (busy || !alive || !video.current) return;
      busy = true;
      try {
        const read = await getDetector();
        if (read && frame(video.current, canvas.current!, 960)) { const raw = await read(canvas.current!); if (raw) found(raw); }
      } catch { /* quadro ruim: segue */ }
      busy = false;
    };
    const t = setInterval(tick, 280);
    return () => { alive = false; clearInterval(t); };
  }, [state]);

  const fromPhoto = async (f?: File) => {
    if (!f) return;
    setErr('');
    try {
      const read = await getDetector();
      if (!read) { setErr('Este navegador não consegue ler códigos de barras. Digite os números.'); return; }
      const bmp = await createImageBitmap(f);
      canvas.current ??= document.createElement('canvas');
      frame(bmp, canvas.current, 1600);
      const raw = await read(canvas.current);
      if (!raw || !found(raw)) setErr('Não achei um código de barras nessa foto. Tente mais perto e sem reflexo, ou digite os números.');
    } catch { setErr('Não consegui abrir essa foto.'); }
  };

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const code = normalizeCode(typed);
    if (!code) { setErr('Esse código não confere. São 8, 12 ou 13 números, embaixo das barras.'); return; }
    setErr(''); setTyped('');
    recent.current = { code: '', at: 0 };
    found(code);
  };

  return (
    <div className="cscan">
      <div className={`cscan__view${state === 'on' ? ' is-on' : ''}`}>
        <video ref={video} playsInline muted autoPlay aria-label="Imagem da câmera" />
        {state === 'on' ? (
          <>
            <span className="cscan__aim" aria-hidden="true"><i /></span>
            <span className="cscan__tip">Aponte para o código de barras, atrás da caixa.</span>
            <button type="button" className="btn ghost sm cscan__stop" onClick={() => { stop(); setState('idle'); }}>Desligar a câmera</button>
          </>
        ) : (
          <div className="cscan__off">
            <span className="cscan__bars" aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ width: [2, 1, 3, 1, 2, 4, 1, 2][i % 8] }} />)}</span>
            {state === 'denied' ? <p>A câmera foi negada. Para liberar, toque no cadeado ao lado do endereço do site. Enquanto isso, dá para mandar uma foto do código ou digitar os números.</p>
              : state === 'nocam' ? <p>Não encontrei uma câmera aqui. Mande uma foto do código ou digite os números.</p>
              : state === 'noreader' ? <p>Este navegador não lê códigos de barras pela câmera. Digite os números, ou use a foto das capas.</p>
              : <p>Leia o código de barras da caixa com a câmera. Dá para ler vários, um atrás do outro.</p>}
            <div className="cscan__acts">
              {state !== 'nocam' && state !== 'noreader' && <button type="button" className="btn primary" onClick={start} disabled={state === 'starting'}><Icon name="camera" size={16} />{state === 'starting' ? 'Abrindo a câmera…' : state === 'denied' ? 'Tentar de novo' : 'Abrir a câmera'}</button>}
              {state !== 'noreader' && <button type="button" className="btn ghost" onClick={() => file.current?.click()}>Foto do código</button>}
            </div>
          </div>
        )}
      </div>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { fromPhoto(e.target.files?.[0]); e.target.value = ''; }} />
      <form className="cscan__type" onSubmit={submit}>
        <label htmlFor="cscan-n" className="faint">Ou digite os números</label>
        <input id="cscan-n" className="field mono" inputMode="numeric" autoComplete="off" placeholder="Os números embaixo das barras" value={typed} onChange={(e) => setTyped(e.target.value.replace(/[^\d ]/g, '').slice(0, 18))} />
        <button className="btn ghost" disabled={typed.replace(/\D/g, '').length < 8}>Procurar</button>
      </form>
      {last && <p className="cscan__last" role="status">Lido: <span className="mono">{last}</span></p>}
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}

/** Foto das capas (uma ou várias) lida pela IA. Devolve o que ela viu; a confirmação fica com a lista. */
export function PhotoRead({ online, onGames }: { online: boolean; onGames: (games: { title: string; platform: string; barcode: string; confidence: string }[], seen: string) => void }) {
  const [ai, setAi] = useState<{ ai: boolean; used: number; limit: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [prev, setPrev] = useState<string | null>(null);
  const shoot = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!online) return;
    authed('/api/reconhecer').then(setAi).catch(() => setAi({ ai: false, used: 0, limit: 0 }));
  }, [online]);
  useEffect(() => () => { if (prev) URL.revokeObjectURL(prev); }, [prev]);

  const send = async (f?: File) => {
    if (!f) return;
    setErr(''); setBusy(true);
    try {
      const blob = await shrink(f, 1600);
      setPrev(URL.createObjectURL(blob));
      const j = await authed('/api/reconhecer', { method: 'POST', body: JSON.stringify({ kind: 'foto', image: await toDataUrl(blob) }) });
      setAi((a) => (a ? { ...a, used: j.used, limit: j.limit } : a));
      track('camera.foto');
      if (!j.games?.length) setErr(`Não reconheci nenhum jogo nessa foto.${j.seen ? ` (${j.seen})` : ''} Tente com as capas mais de frente e sem reflexo.`);
      else onGames(j.games, j.seen ?? '');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); }
    setBusy(false);
  };

  if (!online) return (
    <div className="cphoto cphoto--off">
      <p>A leitura das capas por foto usa a IA e precisa de uma conta. Na demonstração, use o código de barras ou o nome.</p>
    </div>
  );
  if (ai && !ai.ai) return <div className="cphoto cphoto--off"><p>A leitura por foto ainda não foi ligada neste site. Use o código de barras ou o nome.</p></div>;
  const left = ai ? Math.max(0, ai.limit - ai.used) : null;
  return (
    <div className="cphoto">
      <div className={`cphoto__view${prev ? ' has-img' : ''}`}>
        {prev ? <img src={prev} alt="A foto enviada" /> : (
          <span className="cphoto__stack" aria-hidden="true"><i /><i /><i /></span>
        )}
        {busy && <span className="cphoto__busy" role="status"><span className="cphoto__scan" aria-hidden="true" />Lendo as capas…</span>}
      </div>
      <p className="muted cphoto__how">Fotografe uma capa, ou várias lado a lado (as lombadas na estante também valem). A IA diz quais jogos viu e você confirma cada um.</p>
      <div className="cscan__acts">
        <button type="button" className="btn primary" onClick={() => shoot.current?.click()} disabled={busy || left === 0}><Icon name="camera" size={16} />{prev ? 'Outra foto' : 'Tirar uma foto'}</button>
        <button type="button" className="btn ghost" onClick={() => gallery.current?.click()} disabled={busy || left === 0}>Escolher da galeria</button>
      </div>
      {left != null && <small className="faint">{left === 0 ? 'As leituras da IA deste mês acabaram. O código de barras e o nome continuam funcionando.' : `${left} de ${ai!.limit} leituras da IA neste mês. A foto não fica guardada.`}</small>}
      <input ref={shoot} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { send(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => { send(e.target.files?.[0]); e.target.value = ''; }} />
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}

/* ---- Da leitura aos candidatos --------------------------------------------------------------- */

const keyOf = () => Math.random().toString(36).slice(2, 10);

/** Escolhe a plataforma do exemplar: a lida (se o jogo saiu nela) ou a primeira do jogo. */
const platformFor = (hit: Hit | null, guess?: string) => (hit ? matchPlatform(guess, hit.platforms) ?? hit.platforms[0] ?? 'Outra plataforma' : '');

/** Se a leitura citou uma plataforma, os jogos que saíram nela vêm primeiro. */
function rank(hits: Hit[], guess?: string) {
  if (!guess) return hits;
  return [...hits.filter((h) => matchPlatform(guess, h.platforms)), ...hits.filter((h) => !matchPlatform(guess, h.platforms))];
}

export function foundFromPhoto(g: { title: string; platform: string; barcode: string; confidence: string }): Found {
  const confidence = (['alta', 'media', 'baixa'].includes(g.confidence) ? g.confidence : 'baixa') as Found['confidence'];
  return { key: keyOf(), from: 'foto', read: g.title, guess: g.platform || undefined, barcode: g.barcode || undefined, confidence, hits: [], chosen: null, platform: '', kind: 'fisico', include: confidence !== 'baixa', searching: true };
}

/** Procura no catálogo os candidatos de uma leitura. */
export async function resolveFound(f: Found, local: Game[], online: boolean): Promise<Found> {
  if (f.from === 'codigo' && f.barcode) {
    if (!online) return { ...f, searching: false, note: 'Na demonstração o código não é consultado. Busque o jogo pelo nome aqui embaixo.' };
    try {
      const j = await authed(`/api/reconhecer?ean=${f.barcode}`) as { matches: { igdbId?: number; slug: string; title: string; platform?: string; votes: number }[]; product: { title: string } | null };
      const top = j.matches[0];
      if (top) {
        const r = await searchGames(top.title, local);
        const same = r.hits.find((h) => h.slug === top.slug) ?? { igdbId: top.igdbId, slug: top.slug, title: top.title, cover: '', platforms: top.platform ? [top.platform] : [] };
        const others = j.matches.slice(1).map((m) => r.hits.find((h) => h.slug === m.slug)).filter((h): h is Hit => !!h);
        const hits = [same, ...others, ...r.hits.filter((h) => h.slug !== same.slug && !others.includes(h))].slice(0, 4);
        return { ...f, searching: false, guess: top.platform, read: f.barcode, note: top.votes > 1 ? `${top.votes} pessoas já confirmaram este código.` : 'Alguém já confirmou este código.', hits, chosen: same, platform: platformFor(same, top.platform), include: true };
      }
      if (j.product?.title) {
        const name = cleanTitle(j.product.title) || j.product.title;
        const guess = platformFromText(j.product.title);
        const r = await searchGames(name, local);
        const hits = rank(r.hits, guess).slice(0, 4);
        return { ...f, searching: false, guess, note: `Na base de códigos: “${j.product.title}”.`, hits, chosen: hits[0] ?? null, platform: platformFor(hits[0] ?? null, guess), include: !!hits[0] };
      }
      return { ...f, searching: false, note: 'Ainda não conheço este código. Busque o jogo pelo nome aqui embaixo: depois de confirmado, o WinnerZ aprende.' };
    } catch (e) { return { ...f, searching: false, note: e instanceof Error ? e.message : 'Não consegui consultar o código agora.' }; }
  }
  const r = await searchGames(f.read, local).catch(() => ({ hits: [] as Hit[] }));
  const hits = rank(r.hits, f.guess).slice(0, 4);
  return { ...f, searching: false, hits, chosen: hits[0] ?? null, platform: platformFor(hits[0] ?? null, f.guess), include: f.include && !!hits[0] };
}

/** Roda as buscas com poucas de cada vez, para não pesar no catálogo. */
export async function resolveAll(list: Found[], local: Game[], online: boolean, each: (f: Found) => void) {
  const queue = [...list];
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    for (let f = queue.shift(); f; f = queue.shift()) each(await resolveFound(f, local, online));
  }));
}

/** A lista de confirmação: um cartão por leitura, com até quatro candidatos, plataforma e formato. */
export function ConfirmList({ items, setItems, online, onDone }: { items: Found[]; setItems: (fn: (l: Found[]) => Found[]) => void; online: boolean; onDone: (n: number) => void }) {
  const games = useStore((s) => s.games);
  const copies = useStore((s) => s.copies);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const index = useMemo(() => {
    const m = new Map<string, Game>();
    for (const g of Object.values(games)) { m.set(`s:${g.slug}`, g); if (g.igdbId) m.set(`i:${g.igdbId}`, g); }
    return m;
  }, [games]);
  const owned = (h: Hit | null, platform: string) => {
    const g = h ? (h.local ?? (h.igdbId ? index.get(`i:${h.igdbId}`) : undefined) ?? index.get(`s:${h.slug}`)) : undefined;
    return !!g && copies.some((c) => c.gameId === g.id && samePlatform(c.platform, platform));
  };
  const upd = (key: string, p: Partial<Found>) => setItems((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const chosen = items.filter((x) => x.include && x.chosen && !x.searching);

  const save = async () => {
    setBusy(true); setErr('');
    const added = new Set<string>();
    const failed: string[] = [];
    for (const f of chosen) {
      const g = await loadGame(f.chosen!).catch(() => null);
      if (!g) { failed.push(f.chosen!.title); continue; }
      actions.mergeGames([g]);
      actions.addCopy({ gameId: g.id, platform: f.platform || g.platforms[0] || 'Outra plataforma', kind: f.kind });
      added.add(f.key);
      if (online && f.barcode) authed('/api/reconhecer', { method: 'POST', body: JSON.stringify({ kind: 'ensinar', code: f.barcode, igdbId: f.chosen!.igdbId ?? g.igdbId, slug: g.slug, title: g.title, platform: f.platform || null }) }).catch(() => null);
    }
    track('camera.adicionou');
    setBusy(false);
    if (!failed.length) { onDone(added.size); return; }
    setItems((l) => l.filter((x) => !added.has(x.key)));
    setErr(`${added.size ? `${added.size} ${added.size === 1 ? 'entrou' : 'entraram'} na estante. ` : ''}Não consegui carregar ${failed.join(', ')} agora. Tente de novo em instantes.`);
  };

  if (!items.length) return null;
  return (
    <div className="cfound">
      <div className="cfound__top"><b>Confira antes de adicionar</b><small className="faint">Escolha a capa certa de cada um. Só entra na estante o que estiver marcado.</small></div>
      <ul className="cfound__list">
        {items.map((f) => (
          <FoundCard key={f.key} f={f} owned={owned(f.chosen, f.platform)} upd={(p) => upd(f.key, p)} remove={() => setItems((l) => l.filter((x) => x.key !== f.key))} />
        ))}
      </ul>
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="cfound__foot">
        <button className="btn primary" disabled={busy || !chosen.length} onClick={save}>{busy ? 'Adicionando…' : chosen.length ? `Adicionar ${chosen.length === 1 ? '1 jogo' : `${chosen.length} jogos`} à estante` : 'Marque um jogo para adicionar'}</button>
        <small className="faint">{items.some((x) => x.searching) ? 'Ainda procurando alguns…' : `${items.length} ${items.length === 1 ? 'leitura' : 'leituras'}`}</small>
      </div>
    </div>
  );
}

function FoundCard({ f, owned, upd, remove }: { f: Found; owned: boolean; upd: (p: Partial<Found>) => void; remove: () => void }) {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [looking, setLooking] = useState(false);
  const search = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLooking(true);
    const r = await searchGames(q.trim(), Object.values(games)).catch(() => ({ hits: [] as Hit[] }));
    const hits = rank(r.hits, f.guess).slice(0, 4);
    upd({ hits, chosen: hits[0] ?? null, platform: platformFor(hits[0] ?? null, f.guess), include: !!hits[0] });
    setLooking(false);
  };
  const pick = (h: Hit) => upd({ chosen: h, platform: platformFor(h, f.guess), include: true });
  const conf = { alta: 'Leitura clara', media: 'Leitura razoável', baixa: 'Leitura incerta' } as const;
  const id = `cf-${f.key}`;
  return (
    <li className={`cfcard${f.include && f.chosen ? ' is-in' : ''}`}>
      <div className="cfcard__head">
        <label className="cfcard__inc">
          <input type="checkbox" checked={f.include && !!f.chosen} disabled={!f.chosen} onChange={(e) => upd({ include: e.target.checked })} aria-describedby={`${id}-r`} />
          <span id={`${id}-r`}>{f.from === 'codigo' ? <>Código <span className="mono">{f.read}</span></> : <>Na foto: <b>“{f.read}”</b></>}{f.guess ? <span className="faint"> · {shortPlatform(f.guess)}</span> : null}</span>
        </label>
        {f.confidence && <span className={`cfcard__conf cfcard__conf--${f.confidence}`}>{conf[f.confidence]}</span>}
        <button type="button" className="icon-btn cfcard__x" onClick={remove} aria-label="Tirar esta leitura"><Icon name="fechar" size={16} /></button>
      </div>
      {f.note && <p className="faint cfcard__note">{f.note}</p>}
      {f.searching ? <p className="faint cfcard__wait" role="status">Procurando no catálogo…</p> : f.hits.length ? (
        <div className="cfcard__grid" role="radiogroup" aria-label="Qual destes é o jogo">
          {f.hits.map((h) => (
            <button type="button" key={h.slug} role="radio" aria-checked={f.chosen?.slug === h.slug} className="cfcard__opt" onClick={() => pick(h)}>
              <span className="cfcard__cover"><CoverArt game={{ title: h.title, cover: h.cover }} /></span>
              <span className="cfcard__t">{h.title}</span>
              <small className="faint">{[h.year, h.platforms.slice(0, 2).map(shortPlatform).join(', ')].filter(Boolean).join(' · ')}</small>
            </button>
          ))}
        </div>
      ) : !f.note ? <p className="faint cfcard__wait">Não achei esse jogo no catálogo. Busque pelo nome aqui embaixo.</p> : null}
      {f.chosen && (
        <div className="cfcard__row">
          <label className="cfcard__sel"><span className="sr-only">Plataforma</span>
            <select className="field" value={f.platform} onChange={(e) => upd({ platform: e.target.value })}>
              {[...new Set([...f.chosen.platforms, ...(f.platform ? [f.platform] : []), 'Outra plataforma'])].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <div className="seg cfcard__seg" role="group" aria-label="Formato">
            {([['fisico', 'Física'], ['digital', 'Digital'], ['assinatura', 'Assinatura']] as const).map(([k, l]) => <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => upd({ kind: k })}>{l}</button>)}
          </div>
          {owned && <span className="cfcard__own">Já está na estante</span>}
        </div>
      )}
      <form className="cfcard__search" onSubmit={search}>
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.hits.length ? 'Não é nenhum destes? Outro nome' : 'Nome do jogo'} aria-label="Buscar o jogo pelo nome" />
        <button className="btn ghost sm" disabled={looking || q.trim().length < 2}>{looking ? 'Buscando…' : 'Buscar'}</button>
      </form>
    </li>
  );
}
