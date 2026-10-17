/**
 * S1 · A sessão na estrutura do jogo: escolher o capítulo (missão, área, etapa…) no começo e no fim da sessão.
 * Atalhos para o item atual e o seguinte, busca na lista pelo que a pessoa escreve (sem acento, "cap 3", erro de
 * digitação) e a foto da tela lida pela IA, que só escolhe entre os itens da lista. A pessoa sempre confirma.
 * Nomes à frente com spoiler ficam escondidos, a não ser que a pessoa tenha escrito o próprio nome.
 */
import { useRef, useState } from 'react';
import { actions } from '../data/store';
import { outlineApi, useOutline } from '../data/outlineApi';
import { findParts, nextOpen, partAt, partsAround, unitOf, type GameOutline, type OutlinePart } from '../lib/outline';
import type { Game, History, PartMark, Session } from '../data/types';
import { shrink } from '../lib/image';
import { Icon } from './Icon';
import { OutlineSheet } from './Outline';
import { Sheet } from './Sheet';
import { useVideos } from '../data/videoApi';
import { PartVideoButton } from './PartVideo';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CONF: Record<string, string> = { alta: 'quase certeza', media: 'provável', baixa: 'palpite' };
type Src = NonNullable<PartMark['src']>;

/** O que a foto mostrou: as sugestões da IA (até 3), para confirmar com um toque. */
type PhotoState = { busy: boolean; err?: string; seen?: string; picks?: { id: string; confidence: string }[]; preview?: string };

export function PartPicker({ game, history, outline, cur, chosen, text, onText, onChoose, mode, onPhoto, placeholder }: {
  game: Game; history: History; outline: GameOutline; cur: OutlinePart | null;
  chosen: OutlinePart | null; text: string; onText: (t: string) => void; onChoose: (p: OutlinePart, src: Src) => void;
  mode: 'inicio' | 'fim';
  /** No fim da sessão: a foto também pode virar o momento "Onde parei". */
  onPhoto?: (blob: Blob) => void;
  placeholder?: string;
}) {
  const u = unitOf(outline);
  const parts = [...outline.parts].sort((a, b) => a.pct - b.pct);
  const numOf = (p: OutlinePart) => parts.findIndex((x) => x.id === p.id) + 1;
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const quick = partsAround(parts, cur, 1);
  const typed = text.trim();
  const results = typed && (!chosen || chosen.name !== typed) ? findParts(parts, typed, 5) : [];
  const masked = (p: OutlinePart) => p.spoiler && (!cur || p.pct > cur.pct) && !fold(p.name).includes(fold(typed || '\u0000'));

  const readPhoto = async (f?: File) => {
    if (!f) return;
    let blob: Blob;
    try { blob = await shrink(f); } catch { setPhoto({ busy: false, err: 'Não consegui abrir essa imagem. Tente outra foto.' }); return; }
    onPhoto?.(blob);
    const preview = URL.createObjectURL(blob);
    setPhoto({ busy: true, preview });
    try {
      const r = await outlineApi.fromPhoto(game.id, blob, typed);
      setPhoto({ busy: false, preview, seen: r.seen, picks: r.picks });
      const top = r.picks[0];
      const p = top && parts.find((x) => x.id === top.id);
      if (p && top.confidence === 'alta') onChoose(p, 'foto');
    } catch (e) { setPhoto({ busy: false, preview, err: e instanceof Error ? e.message : 'A IA não respondeu agora.' }); }
  };

  const label = (p: OutlinePart) => (masked(p) ? `${u.one} ${numOf(p)} (nome com spoiler)` : p.name);
  return (
    <div className="pp">
      <div className="chips pp__quick" role="group" aria-label={mode === 'fim' ? 'Atalhos de onde você parou' : 'Onde você está'}>
        {quick.map((p) => {
          const isCur = cur?.id === p.id;
          const txt = isCur ? (mode === 'fim' ? `Continuo em ${p.name}` : p.name) : p.spoiler ? `Avancei para ${u.a === 'a' ? 'a próxima' : 'o próximo'}` : `Avancei: ${p.name}`;
          return <button type="button" key={p.id} className="chip" aria-pressed={chosen?.id === p.id} onClick={() => onChoose(p, 'lista')}>{txt}</button>;
        })}
      </div>
      <div className="pp__find">
        <input className="field" value={text} onChange={(e) => onText(e.target.value)} maxLength={140}
          placeholder={placeholder ?? `Busque ${u.a} ${u.one.toLowerCase()} pelo nome ou número`}
          aria-label={mode === 'fim' ? 'Onde você parou' : `Em qual ${u.one.toLowerCase()} você está`} />
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { readPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="btn ghost pp__cam" onClick={() => input.current?.click()} aria-label="Foto da tela: a IA acha na lista" title="Foto da tela: a IA acha na lista"><Icon name="camera" size={18} /></button>
      </div>
      {results.length > 0 && (
        <ul className="pp__res" aria-label="Itens da lista">
          {results.map((p) => (
            <li key={p.id}><button type="button" onClick={() => onChoose(p, 'texto')}>
              <span className="mono">{u.one} {numOf(p)}</span><b>{label(p)}</b>{p.group && !masked(p) && p.group !== p.name ? <small>{p.group}</small> : null}
            </button></li>
          ))}
        </ul>
      )}
      {typed && !chosen && !results.length && <p className="faint pp__none">Não achei na lista. {mode === 'fim' ? 'Fica como anotação de onde você parou.' : 'Tente outro nome ou veja a lista.'}</p>}
      {photo && (
        <div className="pp__photo" aria-live="polite">
          {photo.preview && <img src={photo.preview} alt="" />}
          <div>
            {photo.busy ? <span className="muted">Lendo a foto…</span> : photo.err ? <span className="form-error">{photo.err}</span> : (
              <>
                {photo.picks?.length ? <span className="kicker">Pela foto</span> : <span className="muted">A IA não achou este ponto na lista. Escolha abaixo ou escreva o nome.</span>}
                <div className="chips">
                  {(photo.picks ?? []).map((k) => { const p = parts.find((x) => x.id === k.id); return p && <button type="button" key={k.id} className="chip" aria-pressed={chosen?.id === p.id} onClick={() => onChoose(p, 'foto')}>{u.one} {numOf(p)} · {p.name} <small className="faint">{CONF[k.confidence] ?? ''}</small></button>; })}
                </div>
                {photo.seen && <small className="faint">{photo.seen}</small>}
              </>
            )}
          </div>
          <button type="button" className="btn quiet sm pp__x" onClick={() => { if (photo.preview) URL.revokeObjectURL(photo.preview); setPhoto(null); }} aria-label="Tirar a foto"><Icon name="fechar" size={14} /></button>
        </div>
      )}
      <button type="button" className="btn quiet sm pp__all" onClick={() => setSheet(true)}>Ver a lista toda</button>
      {sheet && <OutlineSheet game={game} history={history} outline={outline} onPick={(p) => onChoose(p, 'lista')} onClose={() => setSheet(false)} />}
    </div>
  );
}

/** Começo da sessão: "Você está em X?" (um toque), mudar pela lista ou pela foto. */
export function StartPartCard({ game, history, session }: { game: Game; history: History; session: Session }) {
  const o = useOutline(game.id);
  const vids = useVideos(game.id, (o?.parts.length ?? 0) > 1);
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState('');
  if (!o?.parts.length) return null;
  const parts = o.parts;
  const u = unitOf(o);
  const cur = partAt(parts, history.progress, history.part);
  const from = session.partMarks?.from;
  const choose = (p: OutlinePart, src: Src) => { actions.setSessionStart(session.id, { id: p.id, name: p.name, src }, { id: p.id, pct: p.pct }, parts); setEdit(false); setText(''); };
  if (from && !edit) {
    return (
      <section className="ppcard is-set" aria-labelledby="pp-h">
        <span className="kicker" id="pp-h">Começou em</span>
        <b className="ppcard__name"><Icon name="check" size={16} /> {from.name}</b>
        <PartVideoButton gameId={game.id} gameTitle={game.title} part={parts.find((p) => p.id === from.id)} label={u.one} videos={vids} onDark />
        <button className="btn quiet sm" onClick={() => setEdit(true)}>Mudar</button>
      </section>
    );
  }
  return (
    <section className="ppcard" aria-labelledby="pp-h">
      <span className="kicker" id="pp-h">Onde você está</span>
      {cur && !edit ? (
        <>
          <b className="ppcard__q">Você está em {cur.name}?</b>
          <div className="ppcard__row">
            <button className="btn primary sm" onClick={() => choose(cur, 'lista')}>Isso</button>
            <button className="btn ghost sm" onClick={() => setEdit(true)}>Mudar</button>
            <PartVideoButton gameId={game.id} gameTitle={game.title} part={cur} label={u.one} videos={vids} onDark />
          </div>
        </>
      ) : (
        <>
          <b className="ppcard__q">Em qual {u.one.toLowerCase()} você está?</b>
          <PartPicker game={game} history={history} outline={o} cur={cur} chosen={null} text={text} onText={setText} onChoose={choose} mode="inicio" />
          {edit && <button className="btn quiet sm" onClick={() => { setEdit(false); setText(''); }}>Cancelar</button>}
        </>
      )}
    </section>
  );
}

/* ---- S2: jogos abertos — "O que você fez hoje?" ---------------------------------------------------------------- */

/** Marca várias coisas feitas na sessão (áreas, masmorras, chefes): atalhos, busca, foto e a lista toda por região. */
export function DonePicker({ game, outline, cur, done, picked, onToggle, text, onText, onPhoto }: {
  game: Game; outline: GameOutline; cur: OutlinePart | null; done: Set<string>; picked: { part: OutlinePart; src: Src }[];
  onToggle: (p: OutlinePart, src: Src) => void; text: string; onText: (t: string) => void; onPhoto?: (blob: Blob) => void;
}) {
  const u = unitOf(outline);
  const parts = [...outline.parts].sort((a, b) => a.pct - b.pct);
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const isOn = (p: OutlinePart) => picked.some((x) => x.part.id === p.id);
  const quick = nextOpen(parts, cur, done, 5);
  const typed = text.trim();
  const results = typed ? findParts(parts, typed, 6) : [];
  const tag = (p: OutlinePart) => (p.kind ? ` · ${p.kind}` : '');
  // Nome com spoiler fica coberto até você marcar (quem marcou já passou por ali) ou buscar pelo nome.
  const hide = (p: OutlinePart, src: Src) => !!p.spoiler && src === 'lista' && !isOn(p) && !done.has(p.id);

  const readPhoto = async (f?: File) => {
    if (!f) return;
    let blob: Blob;
    try { blob = await shrink(f); } catch { setPhoto({ busy: false, err: 'Não consegui abrir essa imagem. Tente outra foto.' }); return; }
    onPhoto?.(blob);
    const preview = URL.createObjectURL(blob);
    setPhoto({ busy: true, preview });
    try {
      const r = await outlineApi.fromPhoto(game.id, blob, typed);
      setPhoto({ busy: false, preview, seen: r.seen, picks: r.picks });
      const top = r.picks[0];
      const p = top && parts.find((x) => x.id === top.id);
      if (p && top.confidence === 'alta' && !isOn(p) && !done.has(p.id)) onToggle(p, 'foto');
    } catch (e) { setPhoto({ busy: false, preview, err: e instanceof Error ? e.message : 'A IA não respondeu agora.' }); }
  };
  const chip = (p: OutlinePart, src: Src, extra?: string) => done.has(p.id)
    ? <span key={p.id} className="chip chip--static pp__done"><Icon name="check" size={12} />{p.name}</span>
    : <button type="button" key={p.id} className="chip" aria-pressed={isOn(p)} onClick={() => onToggle(p, src)}>{isOn(p) && <Icon name="check" size={12} />}{hide(p, src) ? `Com spoiler · ${p.kind ?? u.one.toLowerCase()}` : p.name}{extra && !hide(p, src) ? <small className="faint">{extra}</small> : null}</button>;

  return (
    <div className="pp pp--open">
      {picked.length > 0 && <p className="pp__today"><b>Hoje:</b> {picked.map((x) => x.part.name).join(', ')}</p>}
      <div className="chips pp__quick" role="group" aria-label="Próximos da lista">
        {quick.map((p) => chip(p, 'lista', tag(p)))}
      </div>
      <div className="pp__find">
        <input className="field" value={text} onChange={(e) => onText(e.target.value)} maxLength={140} placeholder={`Busque ${u.a === 'a' ? 'uma' : 'um'} ${u.one.toLowerCase()}, região ou chefe`} aria-label="Buscar na lista" />
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { readPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="btn ghost pp__cam" onClick={() => input.current?.click()} aria-label="Foto da tela: a IA acha na lista" title="Foto da tela: a IA acha na lista"><Icon name="camera" size={18} /></button>
      </div>
      {results.length > 0 && <div className="chips pp__found" aria-label="Achados na lista">{results.map((p) => chip(p, 'texto', p.group && p.group !== p.name ? ` · ${p.group}` : tag(p)))}</div>}
      {typed && !results.length && <p className="faint pp__none">Não achei na lista.</p>}
      {photo && (
        <div className="pp__photo" aria-live="polite">
          {photo.preview && <img src={photo.preview} alt="" />}
          <div>
            {photo.busy ? <span className="muted">Lendo a foto…</span> : photo.err ? <span className="form-error">{photo.err}</span> : (
              <>
                {photo.picks?.length ? <span className="kicker">Pela foto</span> : <span className="muted">A IA não achou este ponto na lista.</span>}
                <div className="chips">{(photo.picks ?? []).map((k) => { const p = parts.find((x) => x.id === k.id); return p && chip(p, 'foto', ` · ${CONF[k.confidence] ?? ''}`); })}</div>
                {photo.seen && <small className="faint">{photo.seen}</small>}
              </>
            )}
          </div>
          <button type="button" className="btn quiet sm pp__x" onClick={() => { if (photo.preview) URL.revokeObjectURL(photo.preview); setPhoto(null); }} aria-label="Tirar a foto"><Icon name="fechar" size={14} /></button>
        </div>
      )}
      <button type="button" className="btn quiet sm pp__all" onClick={() => setSheet(true)}>Ver a lista toda</button>
      {sheet && (
        <Sheet title={`${u.title} de ${game.title}`} onClose={() => setSheet(false)} wide>
          <p className="muted ol-sheet__lead">Marque o que você fez nesta sessão. O que já foi feito antes aparece com ✓.</p>
          <div className="pp__groups">
            {groupsOf(parts).map(([g, items]) => (
              <section key={g || '-'} className="pp__group">
                {g && <h3 className="ol-group">{g} <span className="faint">{items.filter((p) => done.has(p.id) || isOn(p)).length} de {items.length}</span></h3>}
                <div className="chips">{items.map((p) => chip(p, 'lista', tag(p)))}</div>
              </section>
            ))}
          </div>
          <div className="sheet__actions"><button className="btn primary" onClick={() => setSheet(false)}>Pronto</button></div>
        </Sheet>
      )}
    </div>
  );
}

/** A lista em grupos (região, ato), na ordem em que aparecem. */
function groupsOf(parts: OutlinePart[]): [string, OutlinePart[]][] {
  const out: [string, OutlinePart[]][] = [];
  for (const p of parts) {
    const g = p.group ?? '';
    const last = out.find((x) => x[0] === g);
    if (last) last[1].push(p); else out.push([g, [p]]);
  }
  return out;
}
