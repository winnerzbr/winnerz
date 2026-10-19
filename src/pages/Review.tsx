/**
 * Revisão trimestral do backlog, sem culpa (J6b): um jogo por vez, até 20, com rascunho guardado no aparelho.
 * Nada muda até a pessoa confirmar no fim; no resumo dá para desfazer ou mudar cada escolha.
 */
import { useEffect, useMemo, useState } from 'react';
import { actions, getState, useStore } from '../data/store';
import { CHOICES, DECISION_DONE, draftSummary, quarterKey, quarterLabel, reviewDue, reviewItems, type Decision, type ReviewItem } from '../lib/review';
import { CoverArt } from '../components/CoverArt';
import { Link } from '../lib/router';
import { SubNav } from '../components/SubNav';
import { localDay } from '../lib/dates';
import { track } from '../lib/track';

const KEY = 'wz.revisao';
type Saved = { quarter: string; decisions: Record<string, Decision>; idx: number };
const load = (q: string): Saved => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v?.quarter === q) return v; } catch { /* sem rascunho */ }
  return { quarter: q, decisions: {}, idx: 0 };
};
const save = (v: Saved | null) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* só nesta visita */ } };

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthYear = (d: string) => `${MESES[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`;
const idle = (days: number) => (days < 60 ? `${days} dias` : days < 365 ? `${Math.round(days / 30)} meses` : days < 730 ? 'mais de um ano' : `${Math.floor(days / 365)} anos`);

function context(i: ReviewItem): string {
  if (i.kind === 'parada') {
    const h = i.history!;
    const base = h.state === 'pausada' ? `Pausado, sem sessão há ${idle(i.idleDays!)}.` : `Em andamento, sem sessão há ${idle(i.idleDays!)}.`;
    return [base, i.whereStopped ? `Parou em: ${i.whereStopped}.` : '', h.progress ? `${h.progress}% do caminho.` : ''].filter(Boolean).join(' ');
  }
  if (i.kind === 'estante') return [i.since ? `Na sua estante desde ${monthYear(i.since)}.` : 'Na sua estante.', 'Ainda sem História.', i.priority === 1 ? 'Já está como prioridade alta.' : ''].filter(Boolean).join(' ');
  return `Nos seus desejos. Lançado ${i.game.releasedOn ? `em ${monthYear(i.game.releasedOn)}` : i.game.year ? `em ${i.game.year}` : 'há tempo'}.`;
}
const KIND_LABEL = { parada: 'Parado há tempo', estante: 'Na estante', desejo: 'Nos desejos' } as const;

function apply(items: ReviewItem[], decisions: Record<string, Decision>) {
  const s = getState();
  for (const i of items) {
    const d = decisions[i.key];
    if (!d || d === 'pular' || d === 'quero') continue;
    if (i.kind === 'parada' && i.history) {
      const h = s.histories.find((x) => x.id === i.history!.id);
      if (!h) continue;
      if (d === 'voltar') { if (h.state === 'pausada') actions.setHistoryState(h.id, 'ativa'); else if (i.journeyId) actions.addFocus(i.journeyId); }
      if (d === 'pausar' && h.state !== 'pausada') actions.setHistoryState(h.id, 'pausada', 'Pausado na revisão do trimestre.');
      if (d === 'encerrar') actions.setHistoryState(h.id, 'encerrada', 'Encerrado na revisão do trimestre, sem culpa.');
    }
    if (i.kind === 'estante') {
      if (d === 'alta') actions.setMyGame(i.game.id, { priority: 1 });
      if (d === 'depois') actions.setMyGame(i.game.id, { notNowUntil: localDay(90), notNowReason: 'revisao' });
      if (d === 'deixar') actions.setMyGame(i.game.id, { wontPlay: true });
    }
    if (i.kind === 'desejo' && d === 'tirar' && s.wishes.some((w) => w.gameId === i.game.id)) actions.toggleWish(i.game.id);
  }
}

function doneLine(sum: ReturnType<typeof draftSummary>) {
  const n = (k: number, one: string, many: string) => (k === 1 ? one : many.replace('#', String(k)));
  const ps = [
    sum.continua.length ? n(sum.continua.length, 'um jogo continua com você', '# jogos continuam com você') : '',
    sum.depois.length ? n(sum.depois.length, 'um ficou para depois', '# ficaram para depois') : '',
    sum.deixou.length ? n(sum.deixou.length, 'você deixou ir um', 'você deixou ir #') : '',
  ].filter(Boolean);
  if (!ps.length) return 'Tudo ficou como estava.';
  const t = ps.length > 1 ? `${ps.slice(0, -1).join(', ')} e ${ps.at(-1)}` : ps[0];
  return `${t[0].toUpperCase()}${t.slice(1)}.`;
}

export function ReviewPage() {
  const s = useStore((x) => x);
  const q = useMemo(() => quarterKey(), []);
  // A lista é montada uma vez: aplicar as escolhas não pode reembaralhar o que está na tela.
  const [items] = useState(() => reviewItems(getState()));
  const [st, setSt] = useState<Saved>(() => load(q));
  const [view, setView] = useState<'cards' | 'resumo' | 'feito'>(() => (load(q).idx >= items.length && items.length ? 'resumo' : 'cards'));
  useEffect(() => { track('revisao.abrir'); }, []);
  useEffect(() => { if (view !== 'feito') save(st); }, [st, view]);

  const cur = items[st.idx];
  const decide = (d: Decision) => {
    const next = { ...st, decisions: { ...st.decisions, [cur.key]: d }, idx: st.idx + 1 };
    setSt(next);
    if (next.idx >= items.length) setView('resumo');
  };
  const finish = () => {
    apply(items, st.decisions);
    actions.setPrefs({ review: { quarter: q, at: new Date().toISOString(), how: 'feita' } });
    track('revisao.feita');
    save(null); setView('feito');
  };
  const sum = draftSummary(items, st.decisions);
  const decided = Object.keys(st.decisions).length;

  const head = (
    <header className="page-head">
      <div className="page-head__text">
        <span className="kicker">Revisão do trimestre · {quarterLabel(q)}</span>
        <h1 className="t big">Revisão sem culpa</h1>
      </div>
      <SubNav pillar="jornada" />
    </header>
  );

  if (view === 'feito') {
    return (
      <main className="page pad bkrev">
        {head}
        <section className="card bkrev__done">
          <h2 className="t">Revisão feita.</h2>
          <p>{doneLine(sum)} A próxima revisão aparece no começo do próximo trimestre.</p>
          <p className="muted">Deixar ir também é escolher. Tudo continua guardado: Histórias, coleção e fichas.</p>
          <div className="bkrev__actions"><Link className="btn primary" to="/jornada/ritmo">Voltar para Meu ritmo</Link><Link className="btn ghost" to="/jornada">Ir para a Jornada</Link></div>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="page pad bkrev">
        {head}
        <section className="card bkrev__done">
          <h2 className="t">Nada parado por aqui.</h2>
          <p className="muted">Nenhuma História esquecida, nenhum jogo da estante esperando e nenhum desejo antigo. Seu backlog está em paz.</p>
          <div className="bkrev__actions">
            {reviewDue(s) && <button className="btn primary" onClick={() => { actions.setPrefs({ review: { quarter: q, at: new Date().toISOString(), how: 'feita' } }); setView('feito'); }}>Marcar a revisão como feita</button>}
            <Link className="btn ghost" to="/jornada/ritmo">Voltar para Meu ritmo</Link>
          </div>
        </section>
      </main>
    );
  }

  if (view === 'resumo') {
    const group = (title: string, xs: ReviewItem[], empty?: string) => (xs.length || empty) ? (
      <section className="bkrev__group">
        <h2 className="kicker">{title}</h2>
        {xs.length ? (
          <ul>
            {xs.map((i) => (
              <li key={i.key} className="bkrev__row">
                <CoverArt game={i.game} />
                <span className="bkrev__row-t"><b>{i.game.title}</b><span className="muted">{DECISION_DONE[st.decisions[i.key]]}</span></span>
                <button className="btn quiet sm" onClick={() => { setSt({ ...st, idx: items.indexOf(i) }); setView('cards'); }}>Mudar</button>
                {st.decisions[i.key] !== 'pular' && <button className="btn quiet sm" onClick={() => setSt({ ...st, decisions: { ...st.decisions, [i.key]: 'pular' } })}>Desfazer</button>}
              </li>
            ))}
          </ul>
        ) : <p className="muted">{empty}</p>}
      </section>
    ) : null;
    return (
      <main className="page pad bkrev">
        {head}
        <section className="card bkrev__summary">
          <h2 className="t">Antes de confirmar</h2>
          <p className="muted">Nada mudou ainda. Confira, desfaça o que quiser e confirme.{decided < items.length ? ` Você olhou ${decided} de ${items.length}; os outros ficam como estão.` : ''}</p>
          {group('Continua com você', sum.continua)}
          {group('Fica para depois', sum.depois)}
          {group('Você deixa ir', sum.deixou)}
          {group('Fica como está', sum.pulou)}
          <div className="bkrev__actions">
            <button className="btn primary lg" onClick={finish}>Confirmar a revisão</button>
            {st.idx < items.length && <button className="btn ghost" onClick={() => setView('cards')}>Continuar olhando</button>}
          </div>
        </section>
      </main>
    );
  }

  const choices = CHOICES[cur.kind];
  return (
    <main className="page pad bkrev">
      {head}
      <p className="bkrev__lead">Um jogo por vez, com calma. Nada aqui é obrigação: deixar ir também é escolher, e nada muda até você confirmar no fim.</p>
      <div className="bkrev__progress" aria-label={`${st.idx + 1} de ${items.length}`}>
        <span className="mono">{st.idx + 1} de {items.length}</span>
        <span className="bkrev__bar" aria-hidden="true"><i style={{ width: `${(st.idx / items.length) * 100}%` }} /></span>
      </div>
      <section className="card bkrev__card" key={cur.key} aria-labelledby="rv-t">
        <Link to={`/jogos/${cur.game.slug}`} className="bkrev__cover" aria-label={`Abrir a ficha de ${cur.game.title}`}><CoverArt game={cur.game} lazy={false} /></Link>
        <div className="bkrev__info">
          <span className="kicker">{KIND_LABEL[cur.kind]}</span>
          <h2 id="rv-t" className="t bkrev__title">{cur.game.title}</h2>
          <p className="muted">{context(cur)}</p>
          <div className="bkrev__choices" role="group" aria-label="O que fazer">
            {choices.map((c) => (
              <button key={c.id} className={`bkrev__choice${st.decisions[cur.key] === c.id ? ' is-on' : ''}`} onClick={() => decide(c.id)}>
                <b>{c.label}</b><span>{c.hint}</span>
              </button>
            ))}
          </div>
          <div className="bkrev__nav">
            <button className="btn quiet sm" disabled={st.idx === 0} onClick={() => setSt({ ...st, idx: st.idx - 1 })}>Anterior</button>
            <button className="btn quiet sm" onClick={() => decide('pular')}>Pular</button>
            <button className="btn ghost sm" onClick={() => setView('resumo')}>Terminar por hoje</button>
          </div>
        </div>
      </section>
    </main>
  );
}

/** Cartão em Meu ritmo: chama para a revisão no começo do trimestre (ou deixa abrir a qualquer hora). */
export function ReviewCard() {
  const s = useStore((x) => x);
  const n = useMemo(() => reviewItems(s).length, [s]);
  // Convite no começo de cada trimestre, ou antes, quando passam de dez jogos parados (no máximo uma vez a cada 30 dias).
  const lastAt = s.prefs.review?.at ? Date.parse(s.prefs.review.at) : 0;
  const due = reviewDue(s) || (n > 10 && Date.now() - lastAt > 30 * 86400000);
  if (!due || !n) return <p className="bkrev__again"><Link to="/jornada/revisao">Revisar o backlog</Link> · olhar com calma o que está parado</p>;
  const q = quarterKey();
  return (
    <section id="revisao" className="card bkrev__invite" aria-labelledby="rvi-h">
      <span className="kicker">Revisão do trimestre · {quarterLabel(q)}</span>
      <h2 id="rvi-h" className="t">{n === 1 ? 'Um jogo parado' : `${n} jogos parados`} para olhar com calma</h2>
      <p className="muted">Histórias esquecidas, jogos que ainda esperam na estante e desejos antigos. Leva poucos minutos, sem culpa: continuar, deixar para depois ou deixar ir.</p>
      <div className="bkrev__actions">
        <Link className="btn primary" to="/jornada/revisao">Começar a revisão</Link>
        <button className="btn quiet" onClick={() => actions.setPrefs({ review: { quarter: q, at: new Date().toISOString(), how: 'dispensada' } })}>Agora não</button>
      </div>
    </section>
  );
}
