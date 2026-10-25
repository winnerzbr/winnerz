import { useEffect, useRef, useState } from 'react';
import { Ditar } from '../components/Ditar';
import { actions, useStore, sessionsOf, sessionMinutes } from '../data/store';
import { intentOf, MET, POUCO } from '../lib/rest';
import { Icon } from '../components/Icon';
import { Backdrop } from '../components/Backdrop';
import { durLabel, hourMin } from '../lib/format';
import { zereiPedeConfirmacao, minutosDaHistoria } from '../lib/zerei';
import { DonePicker, PartPicker } from '../components/PartPicker';
import { useOutline } from '../data/outlineApi';
import { doneIds, isOpenWorld, openProgress, partAt } from '../lib/outline';
import type { Game, History, PartMark } from '../data/types';
import type { OutlinePart } from '../lib/outline';

export type FinishData = { note?: string; whereStopped?: string; feeling?: string; minutes?: number; progress?: number; companions?: string[]; goalDone?: 'sim' | 'quase' | 'nao'; intentMet?: 'sim' | 'meio' | 'nao'; partTo?: PartMark; partDone?: PartMark[];
  /** Pontos para voltar escritos no fim da sessão. */
  points?: string[];
  /** Marcadores da sessão (co-op, ao vivo…). */
  tags?: string[] };

export const FEELINGS = ['Adorei', 'Quero continuar', 'Foi suficiente por hoje', 'Não encaixou'];
const GOALS = [['sim', 'Cumpri'], ['quase', 'Quase'], ['nao', 'Fica para a próxima']] as const;
const POUCO_RESP = [['sim', 'Sim'], ['quase', 'Passei um pouco'], ['nao', 'Não deu']] as const;

/**
 * Etapa 3 da revisão: o fim da sessão numa tela só, por cima da arte do jogo.
 * No alto, o recado para quando voltar (escrito ou ditado), a foto e os pontos para voltar; logo abaixo, marcadores
 * opcionais. Onde parou, como foi, objetivo, companhia, progresso e tempo ficam em "Mais detalhes", fechado por padrão
 * (a tela lembra se você costuma abrir). Nada é obrigatório: o botão guarda o que tiver, até sem recado.
 */
export function FinishFlow({ game, history, sessionNumber, onSavePhoto, progress, startedAt, goal, intent, companions: known, canWho, tagsOn = false, knownTags = [], startAt, onFinish, onZerei, onCancel, onPhoto }: {
  game: Game; history: History; sessionNumber: number; onSavePhoto: (blob: Blob, title: string) => void; progress: number; startedAt: string;
  goal?: string; intent?: string; companions: string[]; canWho: boolean; tagsOn?: boolean; knownTags?: string[]; startAt?: 'recado';
  onFinish: (d: FinishData) => void; onZerei: (d: FinishData) => void; onCancel: () => void; onPhoto: (where: string) => void;
}) {
  const [withWho, setWithWho] = useState<string[]>([]);
  const [who, setWho] = useState('');
  const addWho = (name: string) => { const n = name.trim().slice(0, 40); if (n && !withWho.includes(n)) setWithWho([...withWho, n]); setWho(''); };
  const toggleWho = (name: string) => setWithWho(withWho.includes(name) ? withWho.filter((x) => x !== name) : [...withWho, name]);
  const [p, setP] = useState(progress);
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const [feel, setFeel] = useState<string | undefined>();
  const [done, setDone] = useState<'sim' | 'quase' | 'nao' | undefined>();
  const [met, setMet] = useState<'sim' | 'meio' | 'nao' | undefined>();
  // Pontos para voltar e marcadores, escritos aqui mesmo.
  const [points, setPoints] = useState<string[]>([]);
  const [pointText, setPointText] = useState('');
  const [addingPoint, setAddingPoint] = useState(false);
  const addPoint = () => { const t = pointText.trim().slice(0, 140); if (t && !points.includes(t)) setPoints([...points, t]); setPointText(''); setAddingPoint(false); };
  const [tags, setTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const toggleTag = (t: string) => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : tags.length >= 6 ? tags : [...tags, t]);
  const addTag = () => { const t = tagText.trim().slice(0, 24); if (t && !tags.includes(t) && tags.length < 6) setTags([...tags, t]); setTagText(''); setAddingTag(false); };
  const it = intentOf(intent);
  // A duração é calculada na hora de finalizar; só fica fixa se a pessoa corrigir.
  const auto = sessionMinutes(startedAt, new Date().toISOString());
  const [mins, setMins] = useState<string | null>(null);
  const [fixMins, setFixMins] = useState(false);
  const typed = mins != null && mins.trim() ? Math.max(1, Math.min(1440, Math.round(Number(mins)))) : undefined;
  const minutes = mins == null ? auto : Number.isFinite(typed) ? typed : undefined;
  // S1: com a lista do jogo, "Onde você parou?" acha o item (atalhos, busca ou foto) e move a marca e o progresso.
  const outline = useOutline(game.id);
  const parts = outline?.parts ?? [];
  const cur = partAt(parts, history.progress, history.part);
  const [chosen, setChosen] = useState<{ part: OutlinePart; src: NonNullable<PartMark['src']> } | null>(null);
  const [shot, setShot] = useState<Blob | null>(null);
  const [keepShot, setKeepShot] = useState(true);
  const choose = (part: OutlinePart, src: NonNullable<PartMark['src']>) => { setChosen({ part, src }); setWhere(part.name); setP(part.pct); };
  // S2: jogo aberto ("O que você fez hoje?"): marca várias coisas; o progresso é a parte da lista já feita.
  const open = isOpenWorld(outline) && parts.length > 1;
  const st = useStore((x) => x);
  const before = open ? doneIds(sessionsOf(st, history.id)) : new Set<string>();
  const [picked, setPicked] = useState<{ part: OutlinePart; src: NonNullable<PartMark['src']> }[]>([]);
  const [find, setFind] = useState('');
  const toggle = (part: OutlinePart, src: NonNullable<PartMark['src']>) => {
    const next = picked.some((x) => x.part.id === part.id) ? picked.filter((x) => x.part.id !== part.id) : [...picked, { part, src }];
    setPicked(next);
    setP(next.length ? openProgress(parts, new Set([...before, ...next.map((x) => x.part.id)])) : progress);
  };
  const doneText = picked.map((x) => x.part.name).join(', ');
  const typeWhere = (t: string) => { setWhere(t); if (chosen && t.trim() !== chosen.part.name) { setChosen(null); setP(progress); } };
  const data = (): FinishData => ({ note: note.trim() || undefined, whereStopped: (open && doneText ? `Fez: ${doneText}`.slice(0, 140) : where.trim()) || undefined, feeling: feel, minutes: mins == null ? undefined : minutes, progress: p !== progress ? p : undefined, companions: withWho, goalDone: goal ? done : undefined, intentMet: it ? met : undefined,
    partTo: !open && chosen ? { id: chosen.part.id, name: chosen.part.name, src: chosen.src } : undefined,
    partDone: open && picked.length ? picked.map((x) => ({ id: x.part.id, name: x.part.name, src: x.src })) : undefined,
    points: [...points, ...(pointText.trim() ? [pointText.trim().slice(0, 140)] : [])], tags: tagsOn ? tags : undefined });
  const [zArmed, setZArmed] = useState(false);
  useEffect(() => { if (!zArmed) return; const t = setTimeout(() => setZArmed(false), 6000); return () => clearTimeout(t); }, [zArmed]);
  const close = (fn: (d: FinishData) => void) => {
    const d = data();
    if (!open && chosen && outline) actions.setHistoryPart(history.id, { id: chosen.part.id, pct: chosen.part.pct }, parts);
    if (open && picked.length) actions.markOpenPart(history.id, [...picked].sort((a, b) => b.part.pct - a.part.pct)[0].part.id);
    const label = open ? (doneText ? `Hoje: ${doneText}`.slice(0, 120) : 'Onde parei') : where.trim() ? `Onde parei: ${where.trim()}` : 'Onde parei';
    if (shot && keepShot) onSavePhoto(shot, label);
    fn(d);
  };

  // "Mais detalhes" lembra se você costuma abrir.
  const [more, setMoreRaw] = useState(() => { try { return localStorage.getItem('wz.fim.mais') === '1'; } catch { return false; } });
  const setMore = (v: boolean) => { setMoreRaw(v); try { localStorage.setItem('wz.fim.mais', v ? '1' : '0'); } catch { /* só nesta visita */ } };
  // A tela de baixo não rola enquanto o fim da sessão está aberto.
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (startAt === 'recado') noteRef.current?.focus(); }, [startAt]);
  const startedLabel = hourMin(startedAt);
  const filled = [where.trim() || chosen || picked.length ? 'onde parou' : '', feel ? 'como foi' : '', withWho.length ? 'com quem' : '', p !== progress ? 'progresso' : ''].filter(Boolean);
  const temAlgo = !!(note.trim() || points.length || pointText.trim() || shot || filled.length || tags.length);

  return (
    <div className="ff ff1" role="dialog" aria-modal="true" aria-labelledby="ff-q">
      <Backdrop game={game} className="ff__bg" />
      <div className="ff__shade" aria-hidden="true" />

      <header className="ff__top">
        <button type="button" className="ff__back" onClick={onCancel}>
          <Icon name="voltar" size={16} />Voltar à sessão
        </button>
        <span className="ff__game"><b>{game.title}</b><span>sessão {sessionNumber} encerrada</span></span>
        <span className="ff__time">jogou <b>{minutes ? durLabel(minutes) : '—'}</b></span>
      </header>

      <main className="ff__main ff1__main">
        <label id="ff-q" htmlFor="ff-recado" className="ff__q ff1__q">Quer deixar algo para quando voltar?</label>
        <textarea id="ff-recado" ref={noteRef} className="field ff__text ff1__text" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
          placeholder="Ex.: estou na entrada do castelo; antes de seguir, quero explorar o caminho da esquerda" />
        <div className="ff1__tools">
          <button type="button" className="ff1__ic" onClick={() => onPhoto(where)} aria-label="Tirar ou anexar uma foto" title="Foto de onde você parou"><Icon name="camera" size={20} /></button>
          <Ditar className="ff1__ic" onText={(t) => setNote((n) => (n.trim() ? `${n.trim()} ${t}` : t).slice(0, 500))} />
          {!addingPoint && <button type="button" className="ff1__plus" onClick={() => setAddingPoint(true)}>+ Ponto para voltar</button>}
          <span className="ff1__hint">Aparece no alto da Jornada quando você voltar.</span>
        </div>
        {shot && <label className="pp__keep"><input type="checkbox" checked={keepShot} onChange={(e) => setKeepShot(e.target.checked)} /> Guardar a foto como momento</label>}
        {(points.length > 0 || addingPoint) && (
          <div className="ff1__points">
            <span className="ff1__k">Pontos para voltar</span>
            {points.map((x) => (
              <span key={x} className="ff1__point"><span>{x}</span><button type="button" onClick={() => setPoints(points.filter((y) => y !== x))} aria-label={`Tirar: ${x}`}>×</button></span>
            ))}
            {addingPoint && (
              <form className="ff__where" onSubmit={(e) => { e.preventDefault(); addPoint(); }}>
                <label htmlFor="ff-ponto" className="sr-only">Ponto para voltar</label>
                <input id="ff-ponto" className="field" autoFocus value={pointText} onChange={(e) => setPointText(e.target.value)} maxLength={140} placeholder="Ex.: voltar à caverna com uma tocha" />
                <button type="submit" className="btn ghost" disabled={!pointText.trim()}>Adicionar</button>
              </form>
            )}
          </div>
        )}

        {tagsOn && (
          <div className="ff1__tags">
            <span className="ff1__k">Marcar a sessão (opcional)</span>
            <div className="chips" role="group" aria-label="Marcadores da sessão">
              {[...new Set([...knownTags, ...tags])].map((t) => <button type="button" key={t} className="chip" aria-pressed={tags.includes(t)} onClick={() => toggleTag(t)}>{t}</button>)}
              {addingTag ? (
                <form className="ff1__tagform" onSubmit={(e) => { e.preventDefault(); addTag(); }}>
                  <label htmlFor="ff-tag" className="sr-only">Novo marcador</label>
                  <input id="ff-tag" className="field" autoFocus value={tagText} onChange={(e) => setTagText(e.target.value)} onBlur={() => (tagText.trim() ? addTag() : setAddingTag(false))} maxLength={24} placeholder="Ex.: speedrun" />
                </form>
              ) : tags.length < 6 && <button type="button" className="chip ff1__chipadd" onClick={() => setAddingTag(true)}>+ marcador</button>}
            </div>
          </div>
        )}

        <details className="ff1__more" open={more} onToggle={(e) => setMore((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>Mais detalhes <span>· {filled.length ? filled.join(', ') : 'onde parou, como foi, progresso, com quem'}</span></summary>
          <div className="ff1__sections">
            <section className="ff1__sec" aria-labelledby="ff-onde">
              <h2 id="ff-onde" className="ff1__k">{open ? 'O que você fez hoje?' : 'Onde você parou?'}</h2>
              {open && outline ? (
                <>
                  <p className="ff__mono">{before.size} de {parts.length} feitos antes</p>
                  <DonePicker game={game} outline={outline} cur={cur} done={before} picked={picked} onToggle={toggle} text={find} onText={setFind} onPhoto={setShot} />
                </>
              ) : outline && parts.length > 1 ? (
                <PartPicker game={game} history={history} outline={outline} cur={cur} chosen={chosen?.part ?? null} text={where} onText={typeWhere} onChoose={choose} mode="fim" onPhoto={setShot}
                  placeholder="Busque na lista ou escreva onde parou" />
              ) : (
                <div className="ff__where">
                  <label htmlFor="ff-parei" className="sr-only">Onde você parou?</label>
                  <input id="ff-parei" className="field" placeholder="Ex.: entrei no teatro" value={where} onChange={(e) => setWhere(e.target.value)} maxLength={140} />
                </div>
              )}
            </section>

            {goal && (
              <section className="ff1__sec" aria-labelledby="ff-obj">
                <h2 id="ff-obj" className="ff1__k">{goal === POUCO ? 'Deu para parar na hora?' : `O objetivo: “${goal}”`}</h2>
                <div className="chips" role="group" aria-labelledby="ff-obj">
                  {(goal === POUCO ? POUCO_RESP : GOALS).map(([k, l]) => <button type="button" key={k} className="chip" aria-pressed={done === k} onClick={() => setDone(done === k ? undefined : k)}>{l}</button>)}
                </div>
              </section>
            )}

            {it && (
              <section className="ff1__sec" aria-labelledby="ff-int">
                <h2 id="ff-int" className="ff1__k">{it.ask}</h2>
                <div className="chips" role="group" aria-labelledby="ff-int">
                  {MET.map((x) => <button type="button" key={x.id} className="chip" aria-pressed={met === x.id} onClick={() => setMet(met === x.id ? undefined : x.id)}>{x.label}</button>)}
                </div>
              </section>
            )}

            <section className="ff1__sec" aria-labelledby="ff-como">
              <h2 id="ff-como" className="ff1__k">Como foi a jogatina?</h2>
              <div className="chips" role="group" aria-labelledby="ff-como">
                {FEELINGS.map((f) => <button type="button" key={f} className="chip" aria-pressed={feel === f} onClick={() => setFeel(feel === f ? undefined : f)}>{f}</button>)}
              </div>
            </section>

            {canWho && (
              <section className="ff1__sec" aria-labelledby="ff-quem">
                <h2 id="ff-quem" className="ff1__k">Jogou com alguém?</h2>
                <div className="chips who" role="group" aria-labelledby="ff-quem">
                  {[...new Set([...known, ...withWho])].map((c) => <button type="button" key={c} className="chip" aria-pressed={withWho.includes(c)} onClick={() => toggleWho(c)}>{c}</button>)}
                </div>
                <div className="ff__where">
                  <label htmlFor="ff-who" className="sr-only">Adicionar pessoa</label>
                  <input id="ff-who" className="field" value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWho(who); } }} placeholder="Outro nome (ex.: Ana)" maxLength={40} />
                  <button type="button" className="btn ghost" disabled={!who.trim()} onClick={() => addWho(who)}>Adicionar</button>
                </div>
              </section>
            )}

            <div className="ff__cards">
              <div className="ff__card">
                <div className="ff__card-row"><label htmlFor="ff-prog">Seu progresso</label><span className="ff__big">{p}%</span></div>
                <input id="ff-prog" className="range" type="range" min={0} max={100} value={p} style={{ ['--p' as string]: `${p}%` }} onChange={(e) => setP(Number(e.target.value))} />
                <span className="ff__note">{p !== progress ? `Antes estava em ${progress}%.` : 'Arraste se mudou.'}</span>
              </div>
              <div className="ff__card">
                <div className="ff__card-row"><span>Tempo jogado</span><span className="ff__big">{minutes ? durLabel(minutes) : '—'}</span></div>
                {fixMins ? (
                  <span className="ff__fix">
                    <label htmlFor="ff-mins">Minutos</label>
                    <input id="ff-mins" className="field" type="number" inputMode="numeric" min={1} max={1440} value={mins ?? (auto ? String(auto) : '')} onChange={(e) => setMins(e.target.value)} autoFocus />
                  </span>
                ) : (
                  <span className="ff__note">Começou às {startedLabel}. <button type="button" className="ff__link" onClick={() => setFixMins(true)}>Corrigir</button></span>
                )}
              </div>
            </div>
            <button type="button" className={`ff__zerei${zArmed ? ' is-armed' : ''}`} aria-live="polite" onClick={() => (zArmed ? close(onZerei) : setZArmed(true))}>
              {zArmed ? (zereiPedeConfirmacao(minutosDaHistoria(sessionsOf(st, history.id), history.id) + (minutes ?? 0), p) ? 'Pouco tempo e pouco progresso. Zerou mesmo? Toque de novo' : 'Toque de novo para marcar Zerou') : 'Zerei a campanha nesta sessão'}
            </button>
          </div>
        </details>
      </main>

      <footer className="ff__foot">
        <span className="ff__hint">Nada aqui é obrigatório.</span>
        <button type="button" className="btn primary lg ff__go" onClick={() => close(onFinish)}>{note.trim() ? 'Guardar' : temAlgo ? 'Guardar sem recado' : 'Guardar sem anotar nada'}</button>
      </footer>
    </div>
  );
}
