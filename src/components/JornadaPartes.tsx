/**
 * Etapa 2 da revisão: as partes da nova Jornada do jogo.
 * - Retomar: "Onde você parou": o lugar, o último recado e a última foto num bloco só; os pontos para voltar ficam recolhidos.
 * - DiasJogados: o calendário do mês, sem contador de sequência (lembrança, não meta).
 * - BlocoCampanha: notas fixas da campanha (build, o que não vender, missão), separadas do recado de cada sessão.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { History, Session, TimelineEvent } from '../data/types';
import { actions } from '../data/store';
import { durLabel } from '../lib/format';
import { awayLabel } from '../lib/recap';
import { Icon } from './Icon';
import { Link } from '../lib/router';
import { track } from '../lib/track';
import { useBridges, PROVIDER_NAME, type Provider } from '../data/bridgeApi';

const tz = 'America/Sao_Paulo';
/** "Qui 22 out": o dia da semana, o dia e o mês, sem pontos nem "de". */
const diaCurto = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).formatToParts(new Date(iso)).map((x) => [x.type, x.value.replace('.', '')]));
  const wd = p.weekday ?? '';
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1, 3)} ${p.day} ${p.month}`;
};
const diaLongo = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', timeZone: tz }).replace(/\./g, '');

/* ---- Onde você parou ------------------------------------------------------------------------------------------- */
export function Retomar({ last, note, where, next, waypoints, photo, away, far, onPhoto, onLastPhoto, history, extra = [] }: {
  last: Session | null; note: Session | null; where?: string; waypoints: TimelineEvent[]; photo?: { src: string; at: string };
  /** O próximo passo guardado no resumo para voltar (manda sobre o recado). */
  next?: string;
  away: number | null; onPhoto: (i: number) => void; onLastPhoto?: () => void; history: History;
  /** Uma semana ou mais longe: o bloco diz há quanto tempo e vira o ponto de chegada do link "Preparar a volta". */
  far?: boolean;
  /** O que o resumo para voltar guardou além do lugar e do próximo passo. */
  extra?: { label: string; text: string }[];
}) {
  const [novo, setNovo] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => { if (far) track('jornada.preparar-volta'); }, [far]);
  // O próximo passo do resumo manda; sem ele, o recado mais recente; sem nada, a última sessão (nunca um bloco vazio).
  const recado = next ?? note?.note;
  const fonte = note?.note && !next ? note : last;
  const meta = fonte ? [`${next ? 'Seu resumo para voltar' : note?.note ? 'Seu recado' : 'Última sessão'} · ${diaLongo(fonte.startedAt)}`, fonte.minutes ? `sessão de ${durLabel(fonte.minutes)}` : ''].filter(Boolean).join(' · ') : '';
  const add = () => { const t = novo.trim(); if (t) actions.addWaypoint(history.id, t); setNovo(''); setAdding(false); };
  const comFoto = waypoints.filter((w) => w.image);
  return (
    <section id="voltar" className={`jret${photo ? '' : ' jret--solo'}`} aria-labelledby="jret-h">
      <div className="jret__main">
        <h2 id="jret-h" className="jret__k"><span className="tr now" aria-hidden="true" />Onde você parou{away != null && away > 1 ? <span className="jret__ago">{far ? 'última vez ' : ''}{awayLabel(away)}</span> : null}</h2>
        {where && <p className="t jret__where">{where}</p>}
        {recado ? <p className="jret__note">“{recado}”</p>
          : last ? <p className="jret__none">{where ? 'Sem recado da última vez.' : 'Sem recado nem lugar da última vez.'} No fim da próxima sessão, deixe uma frase para a próxima vez.</p>
          : <p className="jret__none">Nada registrado ainda. Comece uma sessão: no fim, você deixa um recado para a próxima vez.</p>}
        {meta && <span className="jret__meta">{meta}</span>}
        {extra.length > 0 && (
          <dl className="jret__caps">
            {extra.map((x) => <div key={x.label}><dt>{x.label}</dt><dd>{x.text}</dd></div>)}
          </dl>
        )}
        <details className="jret__wps" open={adding || undefined}>
          <summary><span className="jret__k2">{waypoints.length ? `Pontos para voltar · ${waypoints.length}` : 'Pontos para voltar'}</span><Icon name="avancar" size={14} /></summary>
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
        </details>
      </div>
      {photo && (
        <figure className="jret__photo">
          <button type="button" onClick={onLastPhoto} disabled={!onLastPhoto} aria-label="Ver sua última foto deste jogo"><img src={photo.src} alt="" /></button>
          <figcaption>Sua última foto · {diaCurto(photo.at)}</figcaption>
        </figure>
      )}
    </section>
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
