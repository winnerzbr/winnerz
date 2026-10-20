/**
 * Tradutor de tela (/jogos/<jogo>/traduzir): para jogos sem português. A pessoa aponta o celular para a TV (ou escolhe
 * a janela do jogo no computador, ou envia uma captura), toca, e lê o texto traduzido por cima da imagem ou em lista.
 * Só traduz quando a pessoa toca. O glossário do jogo mantém os nomes iguais; o caderno guarda o texto de cada
 * tradução (nunca a foto). Modos: Diálogo, Menu, Texto longo, Explicar e Estudo.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore } from '../data/store';
import { Icon } from '../components/Icon';
import { Sheet, ConfirmButton } from '../components/Sheet';
import { LANG_NAME, TR_KINDS, TR_MODES, canvasData, grab, quality, tradutorApi, type TrKind, type TrMine, type TrMode, type TrResult } from '../data/tradutorApi';

type Source = 'camera' | 'janela' | 'imagem';
type CamState = 'off' | 'starting' | 'on' | 'denied' | 'none';

const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const canWindow = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia && !coarse();

export function TradutorPage({ slug }: { slug: string }) {
  const s = useStore((x) => x);
  const game = Object.values(s.games).find((g) => g.slug === slug);
  const online = s.mode === 'supabase' && !!s.profile;
  const demo = s.mode !== 'supabase';

  const [source, setSource] = useState<Source>(() => (coarse() ? 'camera' : canWindow() ? 'janela' : 'imagem'));
  const [cam, setCam] = useState<CamState>('off');
  const [mode, setMode] = useState<TrMode>('dialogo');
  const [shot, setShot] = useState<{ url: string; data: string; w: number; h: number } | null>(null);
  const [windowOk] = useState(canWindow);
  const [warn, setWarn] = useState<{ dark: boolean; blurry: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TrResult | null>(null);
  const [resultMode, setResultMode] = useState<TrMode>('dialogo');
  const [view, setView] = useState<'foto' | 'lista'>('foto');
  const [err, setErr] = useState('');
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [sheet, setSheet] = useState<'glossario' | 'caderno' | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { if (online || demo) void tradutorApi.usage().then(setUsage); }, [online, demo]);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam('off'); };
  useEffect(() => stop, []);

  const startCamera = async () => {
    setErr('');
    if (!navigator.mediaDevices?.getUserMedia) { setCam('none'); return; }
    setCam('starting');
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      stream.current = st; attach(st); setCam('on');
    } catch (e) { const n = (e as { name?: string }).name; setCam(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : 'none'); }
  };
  const startWindow = async () => {
    setErr('');
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'window' } as MediaTrackConstraints, audio: false });
      stream.current = st; attach(st); setCam('on');
      st.getVideoTracks()[0]?.addEventListener('ended', () => { stream.current = null; setCam('off'); });
    } catch { setCam('off'); }
  };
  const attach = (st: MediaStream) => { const v = video.current; if (v) { v.srcObject = st; void v.play().catch(() => null); } };
  // A câmera liga sozinha no celular; a janela só quando a pessoa escolhe (o navegador pede a janela).
  useEffect(() => { stop(); if (source === 'camera' && !shot) void startCamera(); }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const take = (c: HTMLCanvasElement | null, check = true) => {
    if (!c) { setErr('Não consegui pegar a imagem. Tente de novo.'); return; }
    const data = canvasData(c);
    setShot({ url: data, data, w: c.width, h: c.height }); setResult(null); setErr('');
    const q = check ? quality(c) : { dark: false, blurry: false };
    if (q.dark || q.blurry) { setWarn(q); return; }
    setWarn(null); void run(data, mode, false);
  };
  const shoot = () => { if (video.current && cam === 'on') take(grab(video.current)); };
  const pickFile = async (f?: File) => {
    if (!f) return;
    try { const bmp = await createImageBitmap(f); take(grab(bmp as unknown as HTMLCanvasElement), false); } catch { setErr('Não consegui abrir essa imagem.'); }
  };

  const run = async (data: string, m: TrMode, better: boolean) => {
    if (!game) return;
    setBusy(true); setErr(''); setWarn(null);
    try {
      const r = await tradutorApi.translate(game.id, data, m, better);
      setResult(r); setResultMode(m); setUsage({ used: r.used, limit: r.limit });
      if (!r.lines.some((l) => l.box)) setView('lista');
    } catch (e) { setErr(e instanceof Error ? e.message : 'A IA não respondeu agora. Tente de novo.'); }
    finally { setBusy(false); }
  };
  const again = () => { setShot(null); setResult(null); setWarn(null); setErr(''); if (source === 'camera' && cam !== 'on') void startCamera(); };

  if (!game) return (
    <div className="page tdz-empty"><p className="muted">Abra o Tradutor pela página do jogo.</p><Link className="btn ghost" to={`/jogos/${slug}`}>Ver o jogo</Link></div>
  );
  if (s.mode === 'supabase' && !s.profile) return (
    <div className="page tdz-empty"><p className="muted">Entre na sua conta para usar o Tradutor de tela.</p><Link className="btn primary" to="/entrar">Entrar</Link></div>
  );

  const showLive = !shot && (source === 'camera' || source === 'janela');
  const langName = result?.lang ? LANG_NAME[result.lang] ?? result.lang : '';

  return (
    <div className="page tdz">
      <header className="tdz__head">
        <Link to={`/jogos/${game.slug}`} className="tdz__back"><Icon name="voltar" size={18} /><span>{game.title}</span></Link>
        <h1 className="t tdz__title">Tradutor de tela</h1>
        <div className="tdz__tools">
          {usage && <span className="tdz__usage" title="Traduções usadas neste mês">{usage.used} de {usage.limit} no mês</span>}
          <button className="btn ghost sm" onClick={() => setSheet('glossario')}>Glossário</button>
          <button className="btn ghost sm" onClick={() => setSheet('caderno')}>Caderno</button>
        </div>
      </header>

      <div className="seg seg--sm tdz__src" role="group" aria-label="De onde vem a imagem">
        <button aria-pressed={source === 'camera'} onClick={() => { setShot(null); setResult(null); setSource('camera'); }}><Icon name="camera" size={14} />Câmera</button>
        {windowOk && <button aria-pressed={source === 'janela'} onClick={() => { setShot(null); setResult(null); setSource('janela'); }}><Icon name="grade" size={14} />Janela do jogo</button>}
        <button aria-pressed={source === 'imagem'} onClick={() => { setShot(null); setResult(null); setSource('imagem'); }}><Icon name="imagem" size={14} />Enviar imagem</button>
      </div>

      <div className={`tdz__stage${busy ? ' is-busy' : ''}${result && view === 'foto' ? ' has-bands' : ''}`}>
        <video ref={video} playsInline muted autoPlay aria-label="Imagem da câmera" hidden={!showLive || cam !== 'on'} />
        {showLive && cam !== 'on' && (
          <div className="tdz__idle">
            {source === 'camera' && cam === 'starting' && <p className="muted">Abrindo a câmera…</p>}
            {source === 'camera' && cam === 'denied' && <><p>O navegador não deixou usar a câmera.</p><p className="faint">Libere a câmera nas permissões do site, ou envie uma imagem.</p></>}
            {source === 'camera' && cam === 'none' && <><p>Não achei uma câmera neste aparelho.</p><button className="btn ghost" onClick={() => setSource('imagem')}>Enviar uma imagem</button></>}
            {source === 'camera' && cam === 'off' && <button className="btn primary" onClick={() => void startCamera()}><Icon name="camera" size={16} />Ligar a câmera</button>}
            {source === 'janela' && <><p>Escolha a janela do jogo. O WinnerZ só olha quando você tocar em Traduzir.</p><button className="btn primary" onClick={() => void startWindow()}><Icon name="grade" size={16} />Escolher a janela</button></>}
          </div>
        )}
        {!shot && source === 'imagem' && (
          <button className="tdz__idle tdz__drop" onClick={() => file.current?.click()}>
            <Icon name="imagem" size={28} /><span>Escolher uma captura de tela</span><span className="faint">Serve também para jogos de celular.</span>
          </button>
        )}
        {showLive && cam === 'on' && <span className="tdz__aim" aria-hidden="true"><i /><i /><i /><i /></span>}
        {shot && (
          <div className="tdz__frame" style={{ aspectRatio: `${shot.w} / ${shot.h}`, width: `min(100cqw, calc(100cqh * ${(shot.w / shot.h).toFixed(4)}))` }}>
            <img className="tdz__shot" src={shot.url} alt="A tela capturada" />
            {result && view === 'foto' && bands(result.lines, resultMode !== 'menu').map((b, i) => (
              <div key={i} className="tdz__band" style={{ left: `${b.box[0]}%`, top: `${b.box[1]}%`, width: `${b.box[2]}%`, minHeight: `${b.box[3]}%` }}>
                {b.lines.map((l, j) => <p key={j}>{l.who && <b>{l.who}: </b>}{l.pt}</p>)}
              </div>
            ))}
          </div>
        )}
        {busy && <div className="tdz__scan" role="status"><i aria-hidden="true" /><span>Lendo a tela…</span></div>}
      </div>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ''; }} />

      {!shot && (
        <>
          <div className="tdz__modes" role="group" aria-label="Modo">
            {TR_MODES.map((m) => <button key={m.id} className="chip" aria-pressed={mode === m.id} title={m.hint} onClick={() => setMode(m.id)}>{m.name}</button>)}
          </div>
          <p className="faint tdz__hint">{TR_MODES.find((m) => m.id === mode)?.hint}{mode === 'explicar' ? ' · usa o modelo melhor (conta 5)' : ''}</p>
          <div className="tdz__shoot">
            {source === 'imagem'
              ? <button className="btn primary lg tdz__shutter" onClick={() => file.current?.click()}><Icon name="imagem" size={18} />Escolher imagem</button>
              : <button className="btn primary lg tdz__shutter" disabled={cam !== 'on'} onClick={shoot}><Icon name="camera" size={20} />Traduzir a tela</button>}
          </div>
        </>
      )}

      {warn && shot && !busy && (
        <div className="tdz__warn" role="alert">
          <p>{warn.dark ? 'A imagem saiu escura.' : 'A imagem saiu tremida.'} O texto pode não ser lido direito.</p>
          <div className="tdz__row"><button className="btn primary" onClick={() => void run(shot.data, mode, false)}>Traduzir assim mesmo</button><button className="btn ghost" onClick={again}>Tirar outra</button></div>
        </div>
      )}

      {err && <p className="awards__error" role="alert">{err}</p>}

      {result && shot && (
        <section className="tdz__result" aria-label="Tradução">
          <div className="tdz__meta">
            <span className="kicker">{langName ? `Do ${langName}` : 'Tradução'} · {TR_MODES.find((m) => m.id === resultMode)?.name}{result.better ? ' · modelo melhor' : ''}</span>
            {result.lines.some((l) => l.box) && (
              <div className="seg seg--sm" role="group" aria-label="Como mostrar">
                <button aria-pressed={view === 'foto'} onClick={() => setView('foto')}>Sobre a imagem</button>
                <button aria-pressed={view === 'lista'} onClick={() => setView('lista')}>Lista</button>
              </div>
            )}
          </div>
          {result.legible === 'nao' || !result.lines.length
            ? <p className="tdz__none">Não consegui ler texto nesta imagem. Chegue mais perto, tire o reflexo da TV e tente de novo.</p>
            : (
              <ol className="tdz__lines">
                {result.lines.map((l, i) => (
                  <li key={i}>
                    {l.who && <span className="tdz__who">{l.who}</span>}
                    <p className="tdz__pt">{l.pt}</p>
                    <p className="tdz__src" lang={result.lang || undefined}>{l.src}</p>
                    {l.reading && <p className="tdz__study"><span>Leitura</span>{l.reading}</p>}
                    {l.literal && <p className="tdz__study"><span>Ao pé da letra</span>{l.literal}</p>}
                  </li>
                ))}
              </ol>
            )}
          {result.legible === 'parcial' && result.lines.length > 0 && <p className="faint tdz__note">Uma parte da tela não deu para ler.</p>}
          {result.explain && <div className="tdz__explain"><span className="kicker">Explicação</span><p>{result.explain}</p></div>}
          {result.terms.length > 0 && <p className="faint tdz__note">Anotados no glossário: {result.terms.map((t) => t.pt).join(', ')}.</p>}
          <div className="tdz__row">
            <button className="btn primary" onClick={again}><Icon name="camera" size={16} />Nova tradução</button>
            {resultMode !== 'explicar' && <button className="btn ghost" disabled={busy} onClick={() => void run(shot.data, 'explicar', true)}>Explicar</button>}
            {!result.better && <button className="btn quiet" disabled={busy} onClick={() => void run(shot.data, resultMode, true)}>Tradução estranha? Tentar de novo</button>}
          </div>
          <p className="faint tdz__note">A tradução já foi para o caderno do jogo. A foto não fica guardada.</p>
        </section>
      )}

      {sheet === 'glossario' && <Glossary gameId={game.id} onClose={() => setSheet(null)} />}
      {sheet === 'caderno' && <Notebook gameId={game.id} onClose={() => setSheet(null)} />}
    </div>
  );
}

/**
 * Faixas sobre a imagem: falas vizinhas (uma embaixo da outra, na mesma coluna) viram um bloco só, para a tradução,
 * que costuma ser mais longa que o original, não cobrir a faixa de baixo.
 */
function bands(lines: TrResult['lines'], merge: boolean): { box: number[]; lines: TrResult['lines'] }[] {
  const out: { box: number[]; lines: TrResult['lines'] }[] = [];
  const sorted = lines.filter((l) => l.box && l.box[2] > 0 && l.box[3] > 0).sort((a, b) => a.box![1] - b.box![1]);
  for (const l of sorted) {
    const [x, y, w, h] = l.box!;
    const g = merge && out.find((o) => {
      const [ox, oy, ow, oh] = o.box;
      const near = y <= oy + oh + 4; // começa até 4% abaixo do fim do bloco
      const cols = Math.min(x + w, ox + ow) - Math.max(x, ox) > Math.min(w, ow) * 0.3;
      return near && cols;
    });
    if (g) {
      const [ox, oy, ow, oh] = g.box;
      const nx = Math.min(x, ox), ny = Math.min(y, oy);
      g.box = [nx, ny, Math.max(x + w, ox + ow) - nx, Math.max(y + h, oy + oh) - ny];
      g.lines.push(l);
    } else out.push({ box: [x, y, w, h], lines: [l] });
  }
  // Largura mínima para caber a frase; sem passar da borda direita.
  for (const o of out) { o.box[2] = Math.max(o.box[2], 24); if (o.box[0] + o.box[2] > 100) o.box[0] = Math.max(0, 100 - o.box[2]); }
  return out;
}

/* ---- Glossário ----------------------------------------------------------------------------------- */

function Glossary({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const share = useStore((s) => s.prefs.trGalera !== false);
  const [data, setData] = useState<TrMine | null>(null);
  const [tab, setTab] = useState<'seus' | 'galera'>('seus');
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState({ src: '', pt: '', kind: 'pessoa' as TrKind });
  const reload = () => tradutorApi.mine(gameId).then(setData).catch((e) => setErr(e instanceof Error ? e.message : 'Não consegui abrir o glossário.'));
  useEffect(() => { void reload(); }, [gameId, share]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = async (src: string, pt: string, kind: TrKind) => {
    setErr('');
    try { await tradutorApi.setTerm(gameId, src, pt, kind); await reload(); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); }
  };
  const kindName = (k: string) => TR_KINDS.find((x) => x.id === k)?.name ?? 'Outro';
  return (
    <Sheet title="Glossário do jogo" onClose={onClose} labelId="tdz-glossary" wide>
      <div className="tdz-gl">
        <p className="muted" style={{ margin: 0 }}>Os nomes que o Tradutor usa sempre igual. A IA anota sozinha; o que você corrige vale dali em diante e a IA não muda mais.</p>
        <label className="tdz-gl__share">
          <input type="checkbox" checked={share} onChange={(e) => actions.setPrefs({ trGalera: e.target.checked })} />
          <span>Usar e compartilhar o glossário da Galera<small className="faint">Só os termos circulam, nunca o texto traduzido.</small></span>
        </label>
        <div className="seg seg--sm" role="group" aria-label="Qual glossário">
          <button aria-pressed={tab === 'seus'} onClick={() => setTab('seus')}>Seus termos{data ? ` · ${data.terms.length}` : ''}</button>
          <button aria-pressed={tab === 'galera'} disabled={!share} onClick={() => setTab('galera')}>Da Galera{data && share ? ` · ${data.galera.length}` : ''}</button>
        </div>
        {!data && !err && <p className="faint">Abrindo…</p>}
        {data && tab === 'seus' && (
          <>
            <form className="tdz-gl__add" onSubmit={(e) => { e.preventDefault(); if (draft.src.trim() && draft.pt.trim()) { void set(draft.src, draft.pt, draft.kind); setDraft({ ...draft, src: '', pt: '' }); } }}>
              <input className="field" placeholder="Original (ex.: ミナ)" maxLength={60} value={draft.src} onChange={(e) => setDraft({ ...draft, src: e.target.value })} aria-label="Termo original" />
              <input className="field" placeholder="Em português" maxLength={60} value={draft.pt} onChange={(e) => setDraft({ ...draft, pt: e.target.value })} aria-label="Em português" />
              <select className="field" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as TrKind })} aria-label="Tipo">{TR_KINDS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
              <button className="btn ghost" type="submit">Adicionar</button>
            </form>
            {data.terms.length === 0 && <p className="faint">Ainda vazio. Os nomes aparecem aqui conforme você traduz.</p>}
            <ul className="tdz-gl__list">
              {data.terms.map((t) => <TermRow key={t.src} src={t.src} pt={t.pt} kind={t.kind} tag={t.origin === 'pessoa' ? 'Você' : 'IA'} kindName={kindName(t.kind)} onSave={(pt) => void set(t.src, pt, t.kind)} onDelete={() => void set(t.src, '', t.kind)} />)}
            </ul>
          </>
        )}
        {data && tab === 'galera' && (
          <>
            {data.galera.length === 0 && <p className="faint">Ninguém da Galera anotou termos deste jogo ainda.</p>}
            <ul className="tdz-gl__list">
              {data.galera.map((t) => (
                <li key={t.src + t.pt}>
                  <span className="tdz-gl__src">{t.src}</span><span className="tdz-gl__arrow" aria-hidden="true">→</span><span className="tdz-gl__pt">{t.pt}</span>
                  <span className="tdz-gl__tag">{kindName(t.kind)}{t.people && t.people > 1 ? ` · ${t.people} pessoas` : ''}</span>
                  <button className="btn quiet sm" onClick={() => void set(t.src, t.pt, t.kind)}>Usar o meu</button>
                </li>
              ))}
            </ul>
          </>
        )}
        {err && <p className="awards__error" role="alert">{err}</p>}
      </div>
    </Sheet>
  );
}

function TermRow({ src, pt, tag, kindName, onSave, onDelete }: { src: string; pt: string; kind: TrKind; tag: string; kindName: string; onSave: (pt: string) => void; onDelete: () => void }) {
  const [v, setV] = useState(pt);
  useEffect(() => setV(pt), [pt]);
  return (
    <li>
      <span className="tdz-gl__src">{src}</span><span className="tdz-gl__arrow" aria-hidden="true">→</span>
      <input className="field tdz-gl__edit" value={v} maxLength={60} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v.trim() && v.trim() !== pt) onSave(v.trim()); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} aria-label={`Tradução de ${src}`} />
      <span className="tdz-gl__tag">{kindName} · {tag}</span>
      <button className="btn quiet sm icon" onClick={onDelete} aria-label={`Apagar ${src}`}><Icon name="fechar" size={14} /></button>
    </li>
  );
}

/* ---- Caderno ------------------------------------------------------------------------------------- */

function Notebook({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [data, setData] = useState<TrMine | null>(null);
  const [err, setErr] = useState('');
  const reload = () => tradutorApi.mine(gameId).then(setData).catch((e) => setErr(e instanceof Error ? e.message : 'Não consegui abrir o caderno.'));
  useEffect(() => { void reload(); }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => {
    const m = new Map<string, TrMine['notes']>();
    for (const n of data?.notes ?? []) { const d = new Date(n.at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }); m.set(d, [...(m.get(d) ?? []), n]); }
    return [...m.entries()];
  }, [data]);
  const del = async (id?: number) => { try { await tradutorApi.deleteNote(gameId, id); await reload(); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } };
  return (
    <Sheet title="Caderno do jogo" onClose={onClose} labelId="tdz-notebook" wide>
      <div className="tdz-nb">
        <p className="muted" style={{ margin: 0 }}>Cada tradução fica aqui como texto, sem a foto, para reler a história depois.</p>
        {!data && !err && <p className="faint">Abrindo…</p>}
        {data && data.notes.length === 0 && <p className="faint">Nenhuma tradução ainda.</p>}
        {days.map(([day, notes]) => (
          <section key={day} className="tdz-nb__day">
            <h3 className="kicker">{day}</h3>
            {notes.map((n) => (
              <article key={n.id} className="tdz-nb__note">
                <div className="tdz-nb__head">
                  <span className="faint">{new Date(n.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {TR_MODES.find((m) => m.id === n.mode)?.name}</span>
                  <button className="btn quiet sm icon" onClick={() => void del(n.id)} aria-label="Apagar esta tradução"><Icon name="fechar" size={14} /></button>
                </div>
                {n.lines.map((l, i) => <p key={i} className="tdz-nb__line">{l.who && <b>{l.who}: </b>}{l.pt}</p>)}
                {n.explain && <p className="tdz-nb__explain">{n.explain}</p>}
              </article>
            ))}
          </section>
        ))}
        {data && data.notes.length > 0 && <ConfirmButton label="Apagar o caderno deste jogo" confirm="Apagar tudo mesmo?" onConfirm={() => void del()} />}
        {err && <p className="awards__error" role="alert">{err}</p>}
      </div>
    </Sheet>
  );
}
