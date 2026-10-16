/**
 * Capítulos do jogo (J3): a faixa de capítulos no cartão de progresso, a folha com a lista (escolher o capítulo,
 * ver o histórico, editar com a comunidade), o "Dá para parar aqui?" e o "Objetivo desta sessão".
 * Nomes de capítulos à frente de onde você está ficam escondidos até você pedir.
 */
import { Fragment, useEffect, useState } from 'react';
import { actions, useStore, lastNote, activeWaypoints } from '../data/store';
import { outlineApi, useOutline, type OutlineEdit } from '../data/outlineApi';
import { partAt, nextPart, stopAdvice, goalSuggestions, STOP_LABEL, unitOf, type OutlinePart, type StopKind, type GameOutline } from '../lib/outline';
import type { Game, History, Session } from '../data/types';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { whenLabel } from '../lib/dates';

const durShort = (m?: number) => (!m ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`);
const STOPS: StopKind[] = ['qualquer', 'fim', 'pontos', 'longe'];

/** O nome que dá para mostrar: à frente de você fica escondido (e o marcado como spoiler, mais ainda). */
function shownName(p: OutlinePart, i: number, ahead: boolean, reveal: boolean, opened: Set<string>) {
  if (opened.has(p.id) || !ahead) return p.name;
  if (reveal && !p.spoiler) return p.name;
  return null;
}

/** De onde veio a lista: o selo "Inferido · confira" do rascunho da IA, as confirmações e o crédito da fonte. */
/** "Tenho o link da wiki": cola o link da página de capítulos, missões, chefes ou do detonado, e a IA monta a lista. */
export function WikiLink({ game, replacing, onClose }: { game: Game; replacing?: boolean; onClose?: () => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    if (!url.trim()) return;
    setBusy(true); setErr('');
    try { await outlineApi.fromLink(game.id, url); onClose?.(); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); } finally { setBusy(false); }
  };
  return (
    <form className="ol-link" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <label className="ol-link__label" htmlFor={`wl-${game.id}`}>Link da página {replacing ? 'certa ' : ''}de capítulos, missões, chefes ou do detonado</label>
      <div className="ol-link__row">
        <input id={`wl-${game.id}`} className="field" type="url" inputMode="url" placeholder="https://….fandom.com/wiki/…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} disabled={busy} />
        <button className="btn primary sm" disabled={busy || !url.trim()}>{busy ? 'Lendo a página…' : 'Montar pela página'}</button>
      </div>
      <small className="faint">Fandom, Wikipedia, wiki.gg, Fextralife, GameFAQs, IGN, PowerPyx e outros guias. A IA lê só essa página{replacing ? ' e troca o rascunho atual' : ''}; conta 1 no seu limite mensal de IA. Leva até um minuto.</small>
      {err && <small className="form-error" role="alert">{err}</small>}
    </form>
  );
}

export function OutlineSource({ game, outline, onEdit }: { game: Game; outline: GameOutline; onEdit?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [link, setLink] = useState(false);
  if (outline.origin !== 'ia') return null;
  const n = outline.confirms ?? 0;
  const confirm = async () => { setBusy(true); setErr(''); try { await outlineApi.confirm(game.id, outline.version); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu.'); } finally { setBusy(false); } };
  return (
    <div className={`ol-prov${outline.confirmed ? ' is-ok' : ''}`}>
      <span className="ol-prov__tag"><Icon name="brilho" size={12} />{outline.confirmed ? 'Rascunho da IA · confirmado pela comunidade' : 'Inferido pela IA · confira'}</span>
      {!outline.confirmed && <span className="ol-prov__n">{n} de 3 confirmações</span>}
      {!!outline.sources?.length && (
        <span className="ol-prov__src">Fonte: {outline.sources.map((x, i) => <span key={x.url}>{i > 0 ? ', ' : ''}<a href={x.url} target="_blank" rel="noopener noreferrer">{x.label}</a>{x.license ? ` (${x.license})` : ''}</span>)}</span>
      )}
      {!outline.confirmed && outline.canEdit && (
        <span className="ol-prov__acts">
          {outline.mine ? <span className="faint">Você confirmou</span> : <button className="btn ghost sm" disabled={busy} onClick={() => void confirm()}><Icon name="check" size={13} />Está certo</button>}
          {onEdit && <button className="btn quiet sm" onClick={onEdit}>Corrigir</button>}
          <button className="btn quiet sm" aria-expanded={link} onClick={() => setLink(!link)}><Icon name="link" size={13} />Tenho o link da wiki</button>
        </span>
      )}
      {link && <WikiLink game={game} replacing onClose={() => setLink(false)} />}
      {err && <small className="form-error" role="alert">{err}</small>}
    </div>
  );
}

export function OutlineStrip({ game, history }: { game: Game; history: History }) {
  const o = useOutline(game.id);
  const [open, setOpen] = useState<false | 'list' | 'edit' | 'link'>(false);
  const empty = !!o && !o.parts.length;
  // Jogo sem capítulos: o servidor monta o rascunho sozinho (uma vez por jogo).
  useEffect(() => { if (empty) void outlineApi.auto(game.id); }, [empty, game.id]);
  if (!o) return null;
  const parts = o.parts;
  const u = unitOf(o);
  const cur = partAt(parts, history.progress, history.part);
  if (!parts.length) {
    if (outlineApi.working(game.id) || o.job === 'rodando') return (
      <div className="ol-strip ol-strip--empty ol-strip--work" role="status">
        <span className="ol-work" aria-hidden="true"><i /><i /><i /></span>
        <p className="muted">Montando a estrutura de {game.title}… A IA pesquisa wikis e detonados e organiza em capítulos, missões ou áreas, para a comunidade conferir. Leva até dois minutos (só na primeira vez).</p>
      </div>
    );
    const st = outlineApi.autoStatus(game.id);
    const why = st?.state === 'limite' ? 'O limite de listas automáticas de hoje acabou; amanhã a IA tenta de novo.' : st?.reason ?? (o.job === 'sem_lista' || o.job === 'erro' ? o.jobNote : null);
    return (
      <div className="ol-strip ol-strip--empty">
        <p className="muted">Este jogo ainda não tem a lista de capítulos, missões ou áreas.{why ? ` ${why}` : ''}{o.canEdit ? ' Monte com a comunidade: ajuda a saber onde dá para parar.' : ''}</p>
        {o.admin && <button className="btn quiet sm" onClick={() => void outlineApi.auto(game.id, true)}><Icon name="brilho" size={14} />Tentar com a IA de novo</button>}
        {o.canEdit && <button className="btn quiet sm" aria-expanded={open === 'link'} onClick={() => setOpen(open === 'link' ? false : 'link')}><Icon name="link" size={14} />Tenho o link da wiki</button>}
        {o.canEdit && <button className="btn quiet sm" onClick={() => setOpen('edit')}><Icon name="mais" size={14} />Montar os capítulos</button>}
        {open === 'link' && <WikiLink game={game} onClose={() => setOpen(false)} />}
        {open === 'edit' && <OutlineSheet game={game} history={history} outline={o} startEditing onClose={() => setOpen(false)} />}
      </div>
    );
  }
  const curPct = cur?.pct ?? history.progress ?? 0;
  return (
    <div className="ol-strip">
      <div className="ol-bar" aria-hidden="true">
        {parts.map((p, i) => {
          const end = parts[i + 1]?.pct ?? 100;
          return <i key={p.id} className={`ol-seg${cur?.id === p.id ? ' is-cur' : p.pct < curPct ? ' is-done' : ''}`} style={{ left: `${p.pct}%`, width: `${Math.max(0.8, end - p.pct)}%` }} />;
        })}
      </div>
      <div className="ol-now">
        <span className="kicker">{u.one} {cur ? parts.indexOf(cur) + 1 : '—'} de {parts.length}{cur?.group && cur.group !== cur.name ? ` · ${cur.group}` : ''}</span>
        <b>{cur ? cur.name : 'Onde você está?'}</b>
        {cur?.stop && <span className={`ol-stop ol-stop--${stopAdvice(cur).tone}`}>{STOP_LABEL[cur.stop]}</span>}
        <button className="btn quiet sm" onClick={() => setOpen('list')}>{cur ? 'Mudar' : 'Escolher onde estou'}</button>
      </div>
      <OutlineSource game={game} outline={o} onEdit={() => setOpen('edit')} />
      {(open === 'list' || open === 'edit') && <OutlineSheet game={game} history={history} outline={o} startEditing={open === 'edit'} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function OutlineSheet({ game, history, outline, onClose, startEditing, onPick }: { game: Game; history: History; outline: GameOutline; onClose: () => void; startEditing?: boolean;
  /** Escolher para um formulário (começo ou fim da sessão) em vez de mover a marca na hora. */ onPick?: (p: OutlinePart) => void }) {
  const [editing, setEditing] = useState(!!startEditing);
  const [reveal, setReveal] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [hist, setHist] = useState<OutlineEdit[] | null>(null);
  const [err, setErr] = useState('');
  const parts = outline.parts;
  const cur = partAt(parts, history.progress, history.part);
  const curPct = cur?.pct ?? history.progress ?? -1;
  const pick = (p: OutlinePart) => { if (onPick) onPick(p); else actions.setHistoryPart(history.id, { id: p.id, pct: p.pct }, parts); onClose(); };
  const loadHist = async () => { try { setHist(await outlineApi.history(game.id)); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para carregar.'); } };

  const u = unitOf(outline);
  if (editing) return <Sheet title={`${u.title} de ${game.title}`} onClose={onClose} wide><OutlineEditor game={game} outline={outline} onDone={() => setEditing(false)} onClose={onClose} /></Sheet>;
  return (
    <Sheet title={`${u.title} de ${game.title}`} onClose={onClose} wide>
      <p className="muted ol-sheet__lead">Toque onde você está: o seu progresso vai para o começo dele (dá para ajustar depois). Os nomes à frente ficam escondidos.</p>
      <label className="ol-reveal"><input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} /> Mostrar os nomes à frente (pode ter spoiler; os marcados como spoiler continuam escondidos)</label>
      <ol className="ol-list">
        {parts.map((p, i) => {
          const ahead = p.pct > curPct;
          const name = shownName(p, i, ahead, reveal, opened);
          const isCur = cur?.id === p.id;
          return (
            <Fragment key={p.id}>{p.group && p.group !== parts[i - 1]?.group && <li className="ol-group" aria-hidden="true">{p.group}</li>}<li className={`ol-row${isCur ? ' is-cur' : ''}${ahead ? ' is-ahead' : ''}`}>
              <span className="ol-row__n mono">{i + 1}</span>
              <div className="ol-row__body">
                {name ? <b>{name}</b> : <button className="ol-hidden" onClick={() => setOpened(new Set([...opened, p.id]))} aria-label={`Mostrar o nome do item ${i + 1}`}>{p.spoiler ? 'Nome com spoiler · tocar para ver' : 'À frente · tocar para ver'}</button>}
                {p.kind && <span className="ol-kind">{p.kind}</span>}
                <span className="ol-row__meta">{[`${p.pct}%`, durShort(p.minutes), p.stop ? STOP_LABEL[p.stop] : ''].filter(Boolean).join(' · ')}</span>
                {p.note && (name || !ahead) && <span className="ol-row__note">{p.note}</span>}
              </div>
              {isCur ? <span className="chip chip--static">Você está aqui</span> : <button className="btn ghost sm" onClick={() => pick(p)}>Estou aqui</button>}
            </li></Fragment>
          );
        })}
      </ol>
      <OutlineSource game={game} outline={outline} onEdit={() => setEditing(true)} />
      <p className="faint ol-sheet__src">{outline.origin === 'ia' ? (outline.confirmed ? 'Rascunho da IA conferido pela comunidade' : 'Rascunho da IA, montado com pesquisa em wikis e detonados') : 'Montado pela comunidade'}{outline.edits ? ` · ${outline.edits} ${outline.edits === 1 ? 'edição' : 'edições'} de ${outline.editors} ${outline.editors === 1 ? 'pessoa' : 'pessoas'}` : ''}{outline.updatedAt ? ` · atualizado em ${whenLabel(outline.updatedAt, 'dia')}` : ''}. Os % são aproximados.</p>
      <div className="sheet__actions">
        {outline.canEdit && <button className="btn ghost" onClick={() => setEditing(true)}><Icon name="caneta" size={15} />Editar a lista</button>}
        {history.part && <button className="btn quiet" onClick={() => { actions.setHistoryPart(history.id, null, parts); onClose(); }}>Tirar a marca</button>}
        {!hist && outline.edits ? <button className="btn quiet" onClick={loadHist}>Ver as edições</button> : null}
        <button className="btn primary" onClick={onClose}>Fechar</button>
      </div>
      {err && <p className="form-error" role="alert">{err}</p>}
      {hist && (
        <ul className="ol-hist">
          {hist.map((e) => (
            <li key={e.id}>
              <span className="mono">{whenLabel(e.at, 'dia')}</span> {e.handle ? `@${e.handle}` : 'conta apagada'} · versão {e.version} · {e.count} {e.count === 1 ? 'item' : 'itens'}{e.note ? ` · “${e.note}”` : ''}
              {outline.admin && e.version !== outline.version && <button className="btn quiet sm" onClick={async () => { try { await outlineApi.revert(game.id, e.id); onClose(); } catch (x) { setErr(x instanceof Error ? x.message : 'Não deu.'); } }}>Voltar para esta</button>}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

type Row = OutlinePart & { key: string };
const newId = () => Math.random().toString(36).slice(2, 10);

function OutlineEditor({ game, outline, onDone, onClose }: { game: Game; outline: GameOutline; onDone: () => void; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>(() => (outline.parts.length ? outline.parts : [{ id: newId(), name: '', pct: 0 }]).map((p) => ({ ...p, key: p.id })));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === k ? { ...r, ...patch } : r)));
  const add = () => { const last = rows[rows.length - 1]; const id = newId(); setRows([...rows, { id, key: id, name: '', pct: Math.min(100, (last?.pct ?? 0) + 10) }]); };
  const save = async () => {
    setBusy(true); setErr('');
    try { await outlineApi.save(game.id, rows.map(({ key: _k, ...p }) => p), outline.version, note); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para salvar.'); setBusy(false); }
  };
  return (
    <div className="ol-edit">
      <p className="muted">Uma linha por capítulo, fase ou área, na ordem do jogo. Use nomes sem spoiler (ou marque “spoiler”). O % é de onde o capítulo começa, aproximado. Edições ficam no histórico.</p>
      <div className="ol-edit__rows">
        {rows.map((r, i) => (
          <div key={r.key} className="ol-edit__row" role="group" aria-label={`Capítulo ${i + 1}`}>
            <span className="ol-edit__n mono" aria-hidden="true">{i + 1}</span>
            <input className="field ol-edit__name" aria-label={`Nome do capítulo ${i + 1}`} placeholder="Nome (ex.: Capítulo 3, A floresta)" value={r.name} maxLength={60} onChange={(e) => set(r.key, { name: e.target.value })} />
            <label className="ol-edit__num"><span>Começa em</span><input className="field" type="number" inputMode="numeric" min={0} max={100} value={r.pct} onChange={(e) => set(r.key, { pct: Number(e.target.value) })} /><span>%</span></label>
            <label className="ol-edit__num"><span>Leva uns</span><input className="field" type="number" inputMode="numeric" min={1} max={600} value={r.minutes ?? ''} onChange={(e) => set(r.key, { minutes: e.target.value ? Number(e.target.value) : undefined })} /><span>min</span></label>
            <select className="field ol-edit__stop" aria-label="Dá para parar no meio?" value={r.stop ?? ''} onChange={(e) => set(r.key, { stop: (e.target.value || undefined) as StopKind | undefined })}>
              <option value="">Dá para parar? (não sei)</option>
              {STOPS.map((k) => <option key={k} value={k}>{STOP_LABEL[k]}</option>)}
            </select>
            <input className="field ol-edit__group" aria-label="Grupo" placeholder="Grupo: região, ato, mundo (opcional)" value={r.group ?? ''} maxLength={40} onChange={(e) => set(r.key, { group: e.target.value || undefined })} />
            <input className="field ol-edit__note" aria-label="Dica curta" placeholder="Dica curta, sem spoiler (opcional)" value={r.note ?? ''} maxLength={140} onChange={(e) => set(r.key, { note: e.target.value })} />
            <label className="ol-edit__chk"><input type="checkbox" checked={!!r.spoiler} onChange={(e) => set(r.key, { spoiler: e.target.checked })} /> O nome é spoiler</label>
            <button type="button" className="btn quiet sm danger" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label={`Tirar o capítulo ${i + 1}`}>Tirar</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost sm" onClick={add} disabled={rows.length >= 60}><Icon name="mais" size={14} />Mais um capítulo</button>
      <label htmlFor="ol-note" className="finish__label">O que você mudou? <span className="faint">(opcional, aparece no histórico)</span></label>
      <input id="ol-note" className="field" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: separei o dia 2 em duas partes" />
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="sheet__actions">
        {outline.parts.length > 0 && <button className="btn quiet" onClick={onDone}>Voltar à lista</button>}
        <button className="btn primary" disabled={busy || !rows.some((r) => r.name.trim())} onClick={save}>{busy ? 'Salvando…' : 'Salvar a lista'}</button>
      </div>
    </div>
  );
}

/** "Dá para parar aqui?" na sessão aberta, pelo capítulo em que você está. */
export function StopCard({ game, history }: { game: Game; history: History }) {
  const o = useOutline(game.id);
  const [open, setOpen] = useState(false);
  if (!o) return null;
  const cur = partAt(o.parts, history.progress, history.part);
  const a = stopAdvice(o.parts.length ? cur : null);
  if (!o.parts.length && !o.canEdit) return null;
  return (
    <section className={`stopcard stopcard--${a.tone}`} aria-labelledby="stop-h">
      <span className="kicker" id="stop-h">Dá para parar aqui?</span>
      <b>{o.parts.length ? a.title : 'Ainda sem capítulos'}</b>
      <p>{o.parts.length ? a.text : 'Ninguém montou os capítulos deste jogo. Com eles, dá para saber onde parar sem perder nada.'}</p>
      {cur?.note && <p className="stopcard__note">“{cur.note}”</p>}
      <small className="faint">{cur ? `${cur.name} · informação da comunidade` : ''}</small>
      <button className="btn quiet sm" onClick={() => setOpen(true)}>{o.parts.length ? (cur ? 'Mudar de capítulo' : 'Escolher o capítulo') : 'Montar os capítulos'}</button>
      {open && <OutlineSheet game={game} history={history} outline={o} startEditing={!o.parts.length} onClose={() => setOpen(false)} />}
    </section>
  );
}

/** "Objetivo desta sessão": um passo pequeno, escolhido entre sugestões ou escrito na hora. */
export function GoalCard({ game, history, session }: { game: Game; history: History; session: Session }) {
  const s = useStore((x) => x);
  const o = useOutline(game.id);
  const [short, setShort] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const parts = o?.parts ?? [];
  const cur = partAt(parts, history.progress, history.part);
  const sug = goalSuggestions({ note: lastNote(s, session.journeyId)?.note, capsuleNext: history.capsule?.next, waypoint: activeWaypoints(s, session.journeyId)[0]?.title, part: cur, next: nextPart(parts, cur), short });
  const setGoal = (g: string) => { actions.setSessionGoal(session.id, g); setTyping(false); setText(''); };
  if (session.goal) {
    return (
      <section className="goalcard is-set" aria-labelledby="goal-h">
        <span className="kicker kicker--now" id="goal-h">Objetivo desta sessão</span>
        <b className="goalcard__goal"><Icon name="check" size={16} /> {session.goal}</b>
        <button className="btn quiet sm" onClick={() => setGoal('')}>Trocar</button>
      </section>
    );
  }
  return (
    <section className="goalcard" aria-labelledby="goal-h">
      <div className="goalcard__head">
        <span className="kicker" id="goal-h">Objetivo desta sessão <span className="faint">(opcional)</span></span>
        <button className="chip" aria-pressed={short} onClick={() => setShort(!short)}><Icon name="relogio" size={13} /> Tenho 20 minutos</button>
      </div>
      <div className="chips goalcard__sug">
        {sug.map((g) => <button key={g} className="chip" onClick={() => setGoal(g)}>{g}</button>)}
        {!typing && <button className="chip chip--add" onClick={() => setTyping(true)}><Icon name="caneta" size={13} /> Escrever o meu</button>}
      </div>
      {typing && (
        <form className="goalcard__own" onSubmit={(e) => { e.preventDefault(); if (text.trim()) setGoal(text); }}>
          <input className="field" autoFocus value={text} maxLength={140} onChange={(e) => setText(e.target.value)} placeholder="Ex.: achar a chave do porão" aria-label="Seu objetivo" />
          <button className="btn primary sm" disabled={!text.trim()}>Pronto</button>
        </form>
      )}
    </section>
  );
}
