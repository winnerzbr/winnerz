/**
 * Etapa 2 da revisão: as partes da nova Jornada do jogo.
 * - Retomar: "Onde você parou", com o último recado em destaque, a última foto e os pontos para voltar.
 * - Registros: a consulta rápida da História, do mais recente ao mais antigo, com busca e as sessões sem anotação juntas.
 * - DiasJogados: o calendário do mês, sem contador de sequência (lembrança, não meta).
 * - BlocoCampanha: notas fixas da campanha (build, o que não vender, missão), separadas do recado de cada sessão.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EventKind, History, Session, TimelineEvent } from '../data/types';
import { actions } from '../data/store';
import { durLabel } from '../lib/format';
import { awayLabel } from '../lib/recap';
import { Icon } from './Icon';
import { Link } from '../lib/router';
import { useBridges, PROVIDER_NAME, type Provider } from '../data/bridgeApi';

const tz = 'America/Sao_Paulo';
/** "Qui 22 out": o dia da semana, o dia e o mês, sem pontos nem "de". */
const diaCurto = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).formatToParts(new Date(iso)).map((x) => [x.type, x.value.replace('.', '')]));
  const wd = p.weekday ?? '';
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1, 3)} ${p.day} ${p.month}`;
};
const diaLongo = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', timeZone: tz }).replace(/\./g, '');
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FONTE: Record<string, string> = { steam: 'Steam', ra: 'RetroAchievements', playnite: 'Playnite' };

/* ---- Onde você parou ------------------------------------------------------------------------------------------- */
export function Retomar({ last, note, where, waypoints, photo, away, onPhoto, onLastPhoto, history, extra = [] }: {
  last: Session | null; note: Session | null; where?: string; waypoints: TimelineEvent[]; photo?: { src: string; at: string };
  away: number | null; onPhoto: (i: number) => void; onLastPhoto?: () => void; history: History;
  /** O que a Cápsula guardou além do lugar (o que fazia, o próximo passo, o que lembrar). */
  extra?: { label: string; text: string }[];
}) {
  const [novo, setNovo] = useState('');
  const [adding, setAdding] = useState(false);
  // O recado mais recente manda; sem recado, o lugar onde parou; sem nada, a última sessão (nunca um bloco vazio).
  const recado = note?.note;
  const fonte = recado ? note! : last;
  const meta = fonte ? [`${recado ? 'Seu recado' : 'Última sessão'} · ${diaLongo(fonte.startedAt)}`, fonte.minutes ? `sessão de ${durLabel(fonte.minutes)}` : '', away != null && away > 1 ? awayLabel(away) : ''].filter(Boolean).join(' · ') : '';
  const add = () => { const t = novo.trim(); if (t) actions.addWaypoint(history.id, t); setNovo(''); setAdding(false); };
  const comFoto = waypoints.filter((w) => w.image);
  return (
    <section className="jret" aria-labelledby="jret-h">
      <div className="jret__main">
        <h2 id="jret-h" className="jret__k"><span className="tr now" aria-hidden="true" />Onde você parou</h2>
        {recado ? <p className="jret__note">“{recado}”</p>
          : where ? <p className="jret__note jret__note--where">Parou em {where}.</p>
          : last ? <p className="jret__none">No fim da próxima sessão, diga onde parou: a frase aparece aqui.</p>
          : <p className="jret__none">Nada registrado ainda. Comece uma sessão: no fim, você deixa um recado para a próxima vez.</p>}
        {meta && <span className="jret__meta">{meta}</span>}
        {(recado && where) || extra.length ? (
          <dl className="jret__caps">
            {recado && where && <div><dt>Lugar</dt><dd>{where}</dd></div>}
            {extra.map((x) => <div key={x.label}><dt>{x.label}</dt><dd>{x.text}</dd></div>)}
          </dl>
        ) : null}
        <div className="jret__wps">
          {waypoints.length > 0 && <span className="jret__k2">Pontos para voltar · {waypoints.length}</span>}
          {waypoints.map((w) => (
            <label key={w.id} className="jret__wp">
              <input type="checkbox" onChange={() => actions.resolveWaypoint(w.id)} aria-label={`Resolvido: ${w.title}`} />
              <span>{w.title}{w.text && w.text !== w.title ? <small> · {w.text}</small> : null}</span>
              {w.image && <button type="button" className="jret__wpimg" onClick={() => onPhoto(comFoto.indexOf(w))} aria-label={`Ver foto: ${w.title}`}><img src={w.image} alt="" /></button>}
            </label>
          ))}
          {adding ? (
            <form className="jret__add" onSubmit={(e) => { e.preventDefault(); add(); }}>
              <input className="field" autoFocus value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={140} placeholder="Ex.: voltar à caverna com uma tocha" aria-label="Novo ponto para voltar" />
              <button className="btn primary sm" type="submit">Guardar</button>
              <button className="btn quiet sm" type="button" onClick={() => { setAdding(false); setNovo(''); }}>Cancelar</button>
            </form>
          ) : <button type="button" className="linklike jret__plus" onClick={() => setAdding(true)}>+ Adicionar ponto para voltar</button>}
        </div>
      </div>
      {photo && (
        <aside className="jret__side">
          <figure className="jret__photo">
            <button type="button" onClick={onLastPhoto} disabled={!onLastPhoto} aria-label="Ver sua última foto deste jogo"><img src={photo.src} alt="" /></button>
            <figcaption>Sua última foto · {diaCurto(photo.at)}</figcaption>
          </figure>
        </aside>
      )}
    </section>
  );
}

/* ---- Diário (um bloco por dia) --------------------------------------------------------------------------------- */
const diaKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
const temTexto = (x: Session) => !!(x.note || x.whereStopped || x.feeling || x.tags?.length);
/** Sessão de 1 ou 2 minutos sem nada escrito: abriu e fechou. Soma no tempo, mas não conta como dia de jogo nem vira linha. */
export const sessaoRelampago = (x: Session) => (x.minutes ?? 0) < 3 && !temTexto(x);
/** Dias em que houve jogo de verdade (várias sessões no mesmo dia contam uma vez). */
export const diasDeJogo = (sessions: Session[]) => new Set(sessions.filter((x) => (x.endedAt || x.minutes) && !sessaoRelampago(x)).map((x) => diaKey(x.startedAt))).size;

type Dia = { key: string; at: string; sess: { s: Session; evs: TimelineEvent[] }[]; soltos: TimelineEvent[]; min: number; fontes: string[] };
type Linha = { t: 'dia'; d: Dia } | { t: 'quietos'; list: Dia[] };

const FILTROS: [string, string][] = [['tudo', 'Tudo'], ['recados', 'Recados'], ['momentos', 'Momentos'], ['pontos', 'Pontos']];
const KINDS: Record<string, EventKind[]> = { momentos: ['momento', 'carta', 'inicio', 'marco'], pontos: ['ponto'] };

export function Registros({ sessions, events, onEdit, onPhoto }: { sessions: Session[]; events: TimelineEvent[]; onEdit: (eventId: string) => void; onPhoto: (src: string, title: string) => void }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('tudo');
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());
  const linhas = useMemo(() => {
    const porSessao = new Map<string, TimelineEvent[]>();
    const soltos: TimelineEvent[] = [];
    const ids = new Set(sessions.map((x) => x.id));
    for (const e of events) {
      if (e.kind === 'sessao') continue;
      if (e.sessionId && ids.has(e.sessionId)) { const l = porSessao.get(e.sessionId) ?? []; l.push(e); porSessao.set(e.sessionId, l); }
      else soltos.push(e);
    }
    const busca = semAcento(q.trim());
    const filtrando = f !== 'tudo' || !!busca;
    const ks = KINDS[f];
    const evPassa = (e: TimelineEvent) => (!busca || semAcento([e.title, e.text, e.quote].filter(Boolean).join(' ')).includes(busca)) && (f === 'tudo' || (!!ks && ks.includes(e.kind)));
    const sessPassa = (x: Session) => {
      if (f !== 'tudo' && f !== 'recados') return false;
      if (f === 'recados' && !(x.note || x.whereStopped)) return false;
      return !busca || semAcento([x.note, x.whereStopped, x.feeling, x.goal, ...(x.companions ?? []), ...(x.tags ?? [])].filter(Boolean).join(' ')).includes(busca);
    };
    const dias = new Map<string, Dia>();
    const dia = (at: string) => { const k = diaKey(at); let d = dias.get(k); if (!d) { d = { key: k, at, sess: [], soltos: [], min: 0, fontes: [] }; dias.set(k, d); } if (at > d.at) d.at = at; return d; };
    for (const x of [...sessions].filter((y) => y.endedAt || y.minutes).sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
      const evs = (porSessao.get(x.id) ?? []).filter((e) => !filtrando || evPassa(e));
      const mostra = filtrando ? (sessPassa(x) && (temTexto(x) || evs.length > 0)) || evs.length > 0 : true;
      if (!mostra) continue;
      const d = dia(x.startedAt);
      d.min += x.minutes ?? 0;
      if (x.source && FONTE[x.source] && !d.fontes.includes(FONTE[x.source])) d.fontes.push(FONTE[x.source]);
      if (temTexto(x) || evs.length) d.sess.push({ s: filtrando && !sessPassa(x) ? { ...x, note: undefined, whereStopped: undefined, feeling: undefined, tags: undefined, companions: undefined } : x, evs });
    }
    for (const e of soltos) if (!filtrando || evPassa(e)) dia(e.at).soltos.push(e);
    const out: Linha[] = [];
    for (const d of [...dias.values()].sort((a, b) => b.key.localeCompare(a.key))) {
      const quieto = !d.sess.length && !d.soltos.length;
      if (quieto && d.min < 3) continue; // só sessões-relâmpago: não vira linha
      if (quieto) { const prev = out.at(-1); if (prev?.t === 'quietos') prev.list.push(d); else out.push({ t: 'quietos', list: [d] }); continue; }
      out.push({ t: 'dia', d });
    }
    return out;
  }, [sessions, events, q, f]);

  const quando = (d: Dia) => <div className="jreg__when"><b>{diaCurto(d.at)}</b><span>{[d.min ? durLabel(d.min) : d.sess.length ? '' : 'sem sessão', ...d.fontes].filter(Boolean).join(' · ')}</span></div>;
  const diaLinha = (d: Dia) => (
    <article key={d.key} className="jreg__row">
      {quando(d)}
      <div className="jreg__body">
        {d.sess.map(({ s: x, evs }) => (
          <div key={x.id} className="jreg__sess">
            {x.note && <p className="jreg__note">{x.note}</p>}
            {x.whereStopped && <p className="jreg__where">Parou em {x.whereStopped}</p>}
            {(x.feeling || x.companions?.length) && <p className="jreg__meta">{[x.feeling ? `Foi “${x.feeling}”` : '', x.companions?.length ? `com ${x.companions.join(', ')}` : ''].filter(Boolean).join(' · ')}</p>}
            {x.tags?.length ? <p className="jreg__tags">{x.tags.map((t) => <span key={t}>{t}</span>)}</p> : null}
            {evs.map((e) => <Evento key={e.id} e={e} onEdit={onEdit} onPhoto={onPhoto} />)}
          </div>
        ))}
        {d.soltos.map((e) => <Evento key={e.id} e={e} onEdit={onEdit} onPhoto={onPhoto} />)}
        {!d.sess.length && !d.soltos.length && <p className="jreg__meta">Jogou, sem anotações.</p>}
      </div>
    </article>
  );

  return (
    <div className="jreg">
      <div className="jreg__tools">
        <label className="jreg__search">
          <Icon name="busca" size={16} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nos recados, momentos e pontos" aria-label="Buscar no diário" />
        </label>
        <div className="chips" role="group" aria-label="Mostrar">
          {FILTROS.map(([id, l]) => <button key={id} type="button" className="chip" aria-pressed={f === id} onClick={() => setF(id)}>{l}</button>)}
        </div>
      </div>
      {!linhas.length ? <p className="faint jreg__empty">{q ? `Nada com “${q}”.` : 'Nada deste tipo nesta História ainda.'}</p> : linhas.map((l) => {
        if (l.t === 'dia') return diaLinha(l.d);
        const key = l.list[0].key;
        if (l.list.length === 1 || abertas.has(key)) return <div key={key} className="jreg__group">{l.list.map(diaLinha)}</div>;
        const min = l.list.reduce((a, d) => a + d.min, 0);
        return (
          <div key={key} className="jreg__row jreg__row--vazias">
            <div className="jreg__when"><b>{`${diaCurto(l.list.at(-1)!.at)} – ${diaCurto(l.list[0].at)}`}</b></div>
            <button type="button" className="jreg__vazias" onClick={() => setAbertas(new Set([...abertas, key]))}>
              {l.list.length} dias de jogo sem anotações{min ? ` · ${durLabel(min)}` : ''} · ver
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Trilha: o progresso da campanha no alto da página ------------------------------------------------------------ */
type TrilhaRow = { part: { id: string; name: string; spoiler?: boolean; group?: string }; n: number; total: number; state: 'passou' | 'atual' | 'frente' };
export function Trilha({ progress, rows, done, unit, onOpen, onAdjust }: { progress: number; rows: TrilhaRow[]; done?: Set<string>; unit: string; onOpen: () => void; onAdjust: () => void }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const cur = rows.find((r) => r.state === 'atual');
  const feitos = done ? rows.filter((r) => done.has(r.part.id)).length : 0;
  const temLista = rows.length > 1;
  // Nada de spoiler no alto da página: em jogo aberto vale a região; item marcado como spoiler nunca aparece pelo nome.
  const lugar = cur ? (done && cur.part.group ? cur.part.group : cur.part.spoiler ? cur.part.group ?? '' : cur.part.name) : '';
  return (
    <section className="jtrilha" aria-label="Progresso da campanha">
      <div className="jtrilha__top">
        <span className="jtrilha__k">{temLista && lugar ? <>Você está em <b>{lugar}</b></> : pct > 0 ? 'Seu progresso' : 'Ainda no começo'}</span>
        <span className="jtrilha__n">
          {temLista && <span>{done ? `${feitos} de ${rows.length} feitos` : cur ? `${unit || 'parte'} ${cur.n} de ${cur.total}` : `${rows.length} ${rows.length === 1 ? 'parte' : 'partes'}`}</span>}
          <button type="button" className="jtrilha__pct" onClick={onAdjust} aria-label={`Progresso: ${pct} por cento. Ajustar`}>{pct}%</button>
        </span>
      </div>
      <button type="button" className={`jtrilha__bar${temLista && rows.length <= 40 ? ' is-stops' : ''}`} onClick={onOpen} aria-label={temLista ? 'Ver a História por partes' : 'Ajustar o progresso'}>
        {temLista && rows.length <= 40
          ? rows.map((r) => <i key={r.part.id} className={done ? (done.has(r.part.id) ? 'is-done' : r.state === 'atual' ? 'is-now' : '') : r.state === 'passou' ? 'is-done' : r.state === 'atual' ? 'is-now' : ''} />)
          : <i className="jtrilha__fill" style={{ width: `${pct}%` }} />}
      </button>
    </section>
  );
}

const ROTULO: Partial<Record<EventKind, string>> = { momento: 'Momento', ponto: 'Ponto para voltar', marco: 'Momento', inicio: 'Começo', carta: 'Carta para o fim' };
function Evento({ e, onEdit, onPhoto }: { e: TimelineEvent; onEdit: (id: string) => void; onPhoto: (src: string, title: string) => void }) {
  const lacrada = e.kind === 'carta';
  return (
    <div className={`jreg__ev jreg__ev--${e.kind}${e.resolved ? ' is-resolved' : ''}`}>
      {e.image && <button type="button" className="jreg__img" onClick={() => onPhoto(e.image!, e.title)} aria-label={`Ver foto: ${e.title}`}><img src={e.image} alt="" loading="lazy" /></button>}
      <div>
        <span className="jreg__evk">{ROTULO[e.kind] ?? 'Registro'}{e.kind === 'ponto' && e.resolved ? ' · resolvido' : ''}</span>
        <p className="jreg__evt">{lacrada ? 'Escrita e lacrada até o fim da História.' : e.title}</p>
        {!lacrada && (e.quote || (e.text && e.text !== e.title)) && <p className="jreg__meta">{e.quote ? `“${e.quote}”` : e.text}</p>}
      </div>
      {!lacrada && <button type="button" className="btn quiet sm jreg__edit" onClick={() => onEdit(e.id)}>Editar</button>}
    </div>
  );
}

/* ---- Dias jogados (calendário do mês) --------------------------------------------------------------------------- */
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function DiasJogados({ sessions, title }: { sessions: Session[]; title: string }) {
  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of sessions) { const k = dKey(new Date(x.startedAt)); m.set(k, (m.get(k) ?? 0) + (x.minutes ?? 0) || 1); }
    return m;
  }, [sessions]);
  const ultimaIso = sessions.reduce<string | null>((a, x) => (!a || x.startedAt > a ? x.startedAt : a), null);
  const ultima = ultimaIso ? new Date(ultimaIso) : new Date();
  const [mes, setMes] = useState(() => ({ y: ultima.getFullYear(), m: ultima.getMonth() }));
  const hoje = new Date();
  const primeiro = new Date(mes.y, mes.m, 1);
  const total = new Date(mes.y, mes.m + 1, 0).getDate();
  const vazios = primeiro.getDay();
  let dias = 0, minutos = 0;
  const cells = Array.from({ length: total }, (_, i) => {
    const d = new Date(mes.y, mes.m, i + 1);
    const min = porDia.get(dKey(d));
    if (min) { dias++; minutos += min; }
    return { n: i + 1, min, hoje: dKey(d) === dKey(hoje), futuro: d > hoje };
  });
  const passo = (n: number) => setMes(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const nivel = (m?: number) => (!m ? '' : m < 60 ? ' is-1' : m < 120 ? ' is-2' : ' is-3');
  return (
    <section className="jcal" aria-labelledby="jcal-h">
      <div className="jcal__head">
        <h2 id="jcal-h" className="jside__k">Dias jogados</h2>
        <div className="jcal__nav">
          <button type="button" onClick={() => passo(-1)} aria-label="Mês anterior">‹</button>
          <span>{MESES[mes.m]} {mes.y}</span>
          <button type="button" onClick={() => passo(1)} aria-label="Próximo mês">›</button>
        </div>
      </div>
      <div className="jcal__grid jcal__wd" aria-hidden="true">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="jcal__grid" role="grid" aria-label={`${MESES[mes.m]} de ${mes.y}: ${dias} ${dias === 1 ? 'dia' : 'dias'} com ${title}`}>
        {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} />)}
        {cells.map((c) => (
          <span key={c.n} role="gridcell" className={`jcal__d${nivel(c.min)}${c.hoje ? ' is-today' : ''}${c.futuro ? ' is-fut' : ''}`} aria-label={`${c.n}${c.min ? `, ${durLabel(c.min)}` : ''}${c.hoje ? ', hoje' : ''}`}>
            <b>{c.n}</b>{c.min ? <i>{durLabel(c.min).replace(/ /g, '')}</i> : null}
          </span>
        ))}
      </div>
      <div className="jcal__leg" aria-hidden="true"><span><i className="is-1" />até 1h</span><span><i className="is-2" />1 a 2h</span><span><i className="is-3" />2h ou mais</span><span><i className="is-today" />hoje</span></div>
      <p className="jcal__sum">{dias ? `${dias} ${dias === 1 ? 'dia' : 'dias'}${minutos > 1 ? ` e ${durLabel(minutos)}` : ''} com ${title} em ${MESES[mes.m].toLowerCase()}.` : `Nenhuma sessão em ${MESES[mes.m].toLowerCase()}.`}</p>
    </section>
  );
}

/* ---- Bloco da campanha ------------------------------------------------------------------------------------------ */
export function BlocoCampanha({ history }: { history: History }) {
  const atual = history.capsule?.pinned ?? '';
  const [edit, setEdit] = useState(false);
  const [t, setT] = useState(atual);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (!edit) setT(atual); }, [atual, edit]);
  useEffect(() => { if (edit) ref.current?.focus(); }, [edit]);
  const linhas = atual.split('\n').map((x) => x.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
  const salvar = () => { actions.setPinned(history.id, t); setEdit(false); };
  return (
    <section className="jbloco" aria-labelledby="jbloco-h">
      <div className="jbloco__head">
        <h2 id="jbloco-h" className="jside__k">Bloco da campanha</h2>
        {!edit && <button type="button" className="linklike" onClick={() => setEdit(true)}>{linhas.length ? 'Editar' : 'Escrever'}</button>}
      </div>
      {edit ? (
        <>
          <textarea ref={ref} className="field jbloco__ta" rows={6} value={t} onChange={(e) => setT(e.target.value)} maxLength={1500}
            placeholder={'Uma nota por linha. Ex.:\nBuild: força e fé\nNão vender a pedra de forja\nFalta 1 item da missão do ferreiro'} />
          <div className="jbloco__acts"><button type="button" className="btn primary sm" onClick={salvar}>Guardar</button><button type="button" className="btn quiet sm" onClick={() => { setT(atual); setEdit(false); }}>Cancelar</button></div>
        </>
      ) : linhas.length ? (
        <ul className="jbloco__list">{linhas.map((l, i) => <li key={i}>{l}</li>)}</ul>
      ) : <p className="jbloco__empty">O que vale para a campanha toda fica fixo aqui: build, senhas, o que não vender, missões pela metade.</p>}
    </section>
  );
}

/* ---- Registro automático ---------------------------------------------------------------------------------------- */
/** Diz o que entra sozinho (pelas pontes ligadas) e o que depende do botão "Começar sessão". */
export function RegistroAuto({ sessions }: { sessions: Session[] }) {
  const b = useBridges();
  const ligadas = (b?.accounts ?? []).filter((a) => a.auto).map((a) => a.provider as Provider);
  const daqui = [...new Set(sessions.map((x) => x.source).filter(Boolean))] as Provider[];
  const nomes = (l: Provider[]) => l.map((p) => PROVIDER_NAME[p]).join(' e ');
  return (
    <section className="jauto" aria-labelledby="jauto-h">
      <h2 id="jauto-h" className="jside__k">Registro automático</h2>
      <p>
        {ligadas.length
          ? `${nomes(ligadas)} ${ligadas.length === 1 ? 'ligada' : 'ligados'}: as sessões que passam por ${ligadas.length === 1 ? 'ela' : 'eles'} entram sozinhas. No console, use “Começar sessão”.`
          : 'Nenhuma ponte ligada. Com a Steam, o RetroAchievements ou o Playnite, as sessões no PC entram sozinhas.'}
        {daqui.length ? ` Neste jogo já ${daqui.length === 1 ? 'entrou' : 'entraram'} sessão pela ${nomes(daqui)}.` : ''}
      </p>
      {ligadas.length < 3 && <Link to="/preferencias#pontes" className="linklike">{ligadas.length ? 'Ligar mais plataformas →' : 'Ligar uma ponte →'}</Link>}
    </section>
  );
}
