import { useEffect, useRef, useState } from 'react';
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

export type FinishData = { note?: string; whereStopped?: string; feeling?: string; minutes?: number; progress?: number; companions?: string[]; goalDone?: 'sim' | 'quase' | 'nao'; intentMet?: 'sim' | 'meio' | 'nao'; partTo?: PartMark; partDone?: PartMark[] };

export const FEELINGS = ['Adorei', 'Quero continuar', 'Foi suficiente por hoje', 'Não encaixou'];
const GOALS = [['sim', 'Cumpri'], ['quase', 'Quase'], ['nao', 'Fica para a próxima']] as const;
const POUCO_RESP = [['sim', 'Sim'], ['quase', 'Passei um pouco'], ['nao', 'Não deu']] as const;

type Step = 'fez' | 'obj' | 'intent' | 'como' | 'recado' | 'quem' | 'num';

/**
 * Fim da sessão em passos, uma pergunta por tela (como a Chegada), por cima da arte do jogo.
 * Nada é obrigatório: "Pular" segue sem responder e "Finalizar sem anotar mais nada" fecha a sessão
 * com o que já foi respondido. Perguntas de um toque seguem sozinhas. O horizonte no alto acende até o passo atual.
 */
export function FinishFlow({ game, history, sessionNumber, onSavePhoto, progress, startedAt, goal, intent, companions: known, canWho, startAt, onFinish, onZerei, onCancel, onPhoto }: {
  game: Game; history: History; sessionNumber: number; onSavePhoto: (blob: Blob, title: string) => void; progress: number; startedAt: string;
  goal?: string; intent?: string; companions: string[]; canWho: boolean; startAt?: 'recado';
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
    partDone: open && picked.length ? picked.map((x) => ({ id: x.part.id, name: x.part.name, src: x.src })) : undefined });
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

  // Os passos: só entram as perguntas que fazem sentido nesta sessão.
  const steps: Step[] = ['fez', ...(goal ? ['obj' as const] : []), ...(it ? ['intent' as const] : []), 'como', 'recado', ...(canWho ? ['quem' as const] : []), 'num'];
  const [i, setI] = useState(() => Math.max(0, startAt === 'recado' ? steps.indexOf('recado') : 0));
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const go = (n: number) => { setZArmed(false); if (n >= steps.length) close(onFinish); else setI(Math.max(0, n)); };
  // Pergunta de um toque: marca e segue sozinha (desmarcar não segue).
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const thenNext = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => go(i + 1), 260); };
  // A tela de baixo não rola enquanto o fim da sessão está aberto.
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } heading.current?.focus(); }, [i]);

  const answered: Record<Step, boolean> = {
    fez: open ? picked.length > 0 : !!where.trim() || !!chosen || !!shot,
    obj: !!done, intent: !!met, como: !!feel, recado: !!note.trim(), quem: withWho.length > 0, num: true,
  };
  const pos = ((i + 1) / steps.length) * 100;
  const hint: Record<Step, string> = { fez: open ? 'Marque quantas quiser' : 'Opcional', obj: 'Um toque e segue', intent: 'Um toque e segue', como: 'Um toque e segue', recado: 'Opcional', quem: 'Opcional', num: 'Último passo' };
  const startedLabel = hourMin(startedAt);

  return (
    <div className="ff" role="dialog" aria-modal="true" aria-labelledby="ff-q">
      <Backdrop game={game} className="ff__bg" />
      <div className="ff__shade" aria-hidden="true" />

      <header className="ff__top">
        <button type="button" className="ff__back" onClick={() => (i > 0 ? go(i - 1) : onCancel())}>
          <Icon name="voltar" size={16} />{i > 0 ? 'Voltar' : 'Voltar à sessão'}
        </button>
        <span className="ff__game"><span className="tr now" aria-hidden="true" /><b>{game.title}</b><span>sessão {sessionNumber} · fim</span></span>
        <span className="ff__time">jogou <b>{minutes ? durLabel(minutes) : '—'}</b></span>
        <div className="ff__hz" role="progressbar" aria-label="Passos do fim da sessão" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-valuetext={`Passo ${i + 1} de ${steps.length}`}>
          <i style={{ width: `${pos}%` }} /><b style={{ left: `${pos}%` }} />
        </div>
      </header>

      <main className="ff__main" key={step}>
        <span className="ff__k">Fim da sessão · {i + 1} de {steps.length}</span>

        {step === 'fez' && (
          <>
            <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">{open ? 'O que você fez hoje?' : 'Onde você parou?'}</h1>
            {open && outline ? (
              <>
                <p className="ff__lead">Toque em tudo o que você fez. <span className="ff__mono">{before.size} de {parts.length} feitos antes</span></p>
                <DonePicker game={game} outline={outline} cur={cur} done={before} picked={picked} onToggle={toggle} text={find} onText={setFind} onPhoto={setShot} />
                {shot && <label className="pp__keep"><input type="checkbox" checked={keepShot} onChange={(e) => setKeepShot(e.target.checked)} /> Guardar a foto como momento</label>}
              </>
            ) : outline && parts.length > 1 ? (
              <>
                <p className="ff__lead">Busque na lista, toque num atalho ou tire uma foto da tela.</p>
                <PartPicker game={game} history={history} outline={outline} cur={cur} chosen={chosen?.part ?? null} text={where} onText={typeWhere} onChoose={choose} mode="fim" onPhoto={setShot}
                  placeholder="Busque na lista ou escreva onde parou" />
                {shot && <label className="pp__keep"><input type="checkbox" checked={keepShot} onChange={(e) => setKeepShot(e.target.checked)} /> Guardar a foto como momento “Onde parei”</label>}
              </>
            ) : (
              <>
                <p className="ff__lead">Em poucas palavras, para você se achar quando voltar. Se quiser, tire uma foto da tela.</p>
                <div className="ff__where">
                  <label htmlFor="ff-parei" className="sr-only">Onde você parou?</label>
                  <input id="ff-parei" className="field" placeholder="Ex.: entrei no teatro" value={where} onChange={(e) => setWhere(e.target.value)} maxLength={140} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); go(i + 1); } }} />
                  <button type="button" className="btn ghost ff__cam" onClick={() => onPhoto(where)} aria-label="Foto de onde você parou" title="Foto de onde você parou"><Icon name="camera" size={18} /></button>
                </div>
              </>
            )}
          </>
        )}

        {step === 'obj' && (
          <>
            {goal === POUCO ? (
              <>
                <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">Deu para parar na hora?</h1>
                <p className="ff__lead">A ideia era jogar só um pouco.</p>
              </>
            ) : (
              <>
                <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">Você cumpriu o objetivo?</h1>
                <p className="ff__lead">No começo da sessão você escreveu: <b>“{goal}”</b></p>
              </>
            )}
            <div className="ff__tiles ff__tiles--3" role="group" aria-label="Cumpriu o objetivo?">
              {(goal === POUCO ? POUCO_RESP : GOALS).map(([k, l]) => <button type="button" key={k} className="ff__tile" aria-pressed={done === k} onClick={() => { if (done === k) setDone(undefined); else { setDone(k); thenNext(); } }}>{l}</button>)}
            </div>
          </>
        )}

        {step === 'intent' && it && (
          <>
            <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">{it.ask}</h1>
            <p className="ff__lead">Era para {it.label.toLowerCase()}.</p>
            <div className="ff__tiles ff__tiles--3" role="group" aria-label={it.ask}>
              {MET.map((x) => <button type="button" key={x.id} className="ff__tile" aria-pressed={met === x.id} onClick={() => { if (met === x.id) setMet(undefined); else { setMet(x.id); thenNext(); } }}>{x.label}</button>)}
            </div>
          </>
        )}

        {step === 'como' && (
          <>
            <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">Como foi a jogatina?</h1>
            <p className="ff__lead">Um toque e já vai para a próxima.</p>
            <div className="ff__tiles" role="group" aria-label="Como foi a jogatina?">
              {FEELINGS.map((f) => <button type="button" key={f} className="ff__tile" aria-pressed={feel === f} onClick={() => { if (feel === f) setFeel(undefined); else { setFeel(f); thenNext(); } }}>{f}</button>)}
            </div>
          </>
        )}

        {step === 'recado' && (
          <>
            <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">Um recado para a próxima vez</h1>
            <p className="ff__lead">Aparece no alto da Jornada quando você voltar a jogar.</p>
            <label htmlFor="ff-recado" className="sr-only">Recado para a próxima vez</label>
            <textarea id="ff-recado" className="field ff__text" rows={4} placeholder="Ex.: falta pegar a chave do porão antes do chefe" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} autoFocus={startAt === 'recado'} />
          </>
        )}

        {step === 'quem' && (
          <>
            <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">Jogou com alguém?</h1>
            <p className="ff__lead">Só se quiser lembrar. Fica só na sua Jornada.</p>
            <div className="chips who" role="group" aria-label="Com quem você jogou">
              {[...new Set([...known, ...withWho])].map((c) => <button type="button" key={c} className="chip" aria-pressed={withWho.includes(c)} onClick={() => toggleWho(c)}>{c}</button>)}
            </div>
            <div className="ff__where">
              <label htmlFor="ff-who" className="sr-only">Adicionar pessoa</label>
              <input id="ff-who" className="field" value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWho(who); } }} placeholder="Outro nome (ex.: Ana)" maxLength={40} />
              <button type="button" className="btn ghost" disabled={!who.trim()} onClick={() => addWho(who)}>Adicionar</button>
            </div>
          </>
        )}

        {step === 'num' && (
          <>
            <h1 id="ff-q" ref={heading} tabIndex={-1} className="ff__q">Confere os números</h1>
            <p className="ff__lead">O WinnerZ calculou sozinho. Mude só se estiver errado.</p>
            <div className="ff__cards">
              <div className="ff__card">
                <div className="ff__card-row"><label htmlFor="ff-prog">Seu progresso</label><span className="ff__big ff__big--now">{p}%</span></div>
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
          </>
        )}
      </main>

      <footer className="ff__foot">
        <span className="ff__hint">{hint[step]}</span>
        {!last && <button type="button" className="ff__now" onClick={() => close(onFinish)}>Finalizar sem anotar mais nada</button>}
        <button type="button" className="btn primary lg ff__go" onClick={() => go(i + 1)}>{last ? 'Finalizar' : answered[step] ? 'Próxima' : 'Pular'}</button>
      </footer>
    </div>
  );
}
