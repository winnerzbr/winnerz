import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { canReview } from '../data/fixesApi';
import {
  ACTIONS_FOR, ACTION_DONE, ACTION_LABEL, HIDE_LABEL, KIND_LABEL, REASON_LABEL, moderationApi, targetLabel, targetLink,
  type LogItem, type ModAction, type QueueItem,
} from '../data/moderationApi';
import { Link } from '../lib/router';

type Tab = 'fila' | 'historico';
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '') : '');
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }) : '');

/** Studio · Moderação: denúncias abertas (agrupadas por alvo) e o histórico do que foi feito, com desfazer. */
export function StudioModerationPage() {
  useStore((s) => s.isAdmin);
  const mode = useStore((s) => s.mode);
  const [tab, setTab] = useState<Tab>('fila');
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [log, setLog] = useState<LogItem[] | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (t: Tab) => {
    setErr('');
    try { if (t === 'fila') setQueue(await moderationApi.queue()); else setLog(await moderationApi.log()); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); }
  }, []);
  useEffect(() => { if (canReview()) void load(tab); }, [tab, load, mode]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 5000); return () => clearTimeout(t); }, [msg]);

  if (!canReview()) return (
    <main className="page pad narrow">
      <h1 className="t big">Moderação</h1>
      <p className="muted lead">Esta tela é só da administração do WinnerZ. Viu algo fora das regras? Use “Denunciar” no perfil, na Jornada ou na vitrine.</p>
      <Link className="btn ghost" to="/regras">Ler as regras</Link>
    </main>
  );

  const done = (it: QueueItem, a: ModAction, n: number) => {
    setQueue((l) => (l ?? []).filter((x) => !(x.kind === it.kind && x.owner === it.owner && x.ref === it.ref)));
    setLog(null);
    setMsg(`${ACTION_DONE[a]}${it.handle ? ` · @${it.handle}` : ''}${n > 1 ? ` · ${n} denúncias resolvidas` : ''}.`);
  };

  return (
    <main className="page pad studio">
      <header className="studio__head">
        <Link to="/studio" className="back">← Studio</Link>
        <h1 className="t big">Moderação</h1>
        <p className="muted lead">Denúncias sobre o que as pessoas mostram no perfil e nas comunidades. Cada ação avisa a pessoa e pode ser desfeita no histórico.</p>
        {mode === 'demo' && <p className="faint">Na demonstração, você mesmo denuncia, modera e recebe os avisos, para ver como tudo fica.</p>}
      </header>
      <div className="seg studio__tabs" role="tablist" aria-label="Seções">
        <button role="tab" aria-selected={tab === 'fila'} aria-pressed={tab === 'fila'} onClick={() => setTab('fila')}>Fila{queue?.length ? ` (${queue.length})` : ''}</button>
        <button role="tab" aria-selected={tab === 'historico'} aria-pressed={tab === 'historico'} onClick={() => setTab('historico')}>Histórico</button>
        <Link to="/regras" className="studio__tablink faint">Regras da comunidade</Link>
      </div>
      {msg && <p className="studio__msg" role="status">{msg}</p>}
      {err && <p className="awards__error" role="alert">{err}</p>}

      {tab === 'fila' && (queue == null ? <p className="faint">Carregando…</p> : queue.length === 0 ? (
        <div className="studio__empty"><b>Nenhuma denúncia esperando.</b><p className="muted">Quando alguém usar “Denunciar”, aparece aqui, juntando as denúncias sobre a mesma coisa.</p></div>
      ) : (
        <ul className="studio__list">{queue.map((it) => <ModCard key={`${it.kind}|${it.owner}|${it.ref}`} item={it} onDone={(a, n) => done(it, a, n)} onError={setErr} />)}</ul>
      ))}

      {tab === 'historico' && (log == null ? <p className="faint">Carregando…</p> : log.length === 0 ? <p className="muted">Nada moderado ainda.</p> : (
        <ul className="modlog">
          {log.map((l) => <LogRow key={l.id} l={l} onUndone={() => { setMsg('Decisão desfeita. A pessoa é avisada se já tinha visto o aviso.'); void load('historico'); }} onError={setErr} />)}
        </ul>
      ))}
    </main>
  );
}

function ModCard({ item, onDone, onError }: { item: QueueItem; onDone: (a: ModAction, n: number) => void; onError: (e: string) => void }) {
  const actions = ACTIONS_FOR[item.kind];
  const [action, setAction] = useState<ModAction>(actions[0]);
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const s = item.now ?? item.snapshot;
  const label = (a: ModAction) => (a === 'ocultar' && HIDE_LABEL[item.kind]) || ACTION_LABEL[a];
  const link = targetLink(item.kind, item.handle, item.ref, s);
  const changed = item.now && JSON.stringify(item.now) !== JSON.stringify(item.snapshot);
  const go = async () => {
    setBusy(true); onError('');
    try { const r = await moderationApi.act(item, action, message, action === 'suspender' ? days : undefined); onDone(action, r.reports); }
    catch (e) { onError(e instanceof Error ? e.message : 'Não deu certo agora.'); setBusy(false); }
  };
  return (
    <li className="modcard">
      <div className="modcard__head">
        <span className="kicker">{KIND_LABEL[item.kind]}</span>
        <b className="modcard__t">{targetLabel(item.kind, s)}</b>
        <span className="muted modcard__who">{item.handle ? <>de <Link to={`/@${item.handle.toLowerCase()}`}>@{item.handle}</Link></> : 'conta sem @'}{item.history ? ` · ${item.history} ${item.history === 1 ? 'decisão anterior' : 'decisões anteriores'}` : ''}{item.suspendedUntil ? ` · suspensa até ${day(item.suspendedUntil)}` : ''}</span>
      </div>
      <div className="modcard__body">
        <dl className="modcard__facts">
          <div><dt>Denúncias</dt><dd>{item.count} · {when(item.firstAt)}{item.count > 1 ? ` a ${when(item.lastAt)}` : ''}</dd></div>
          <div><dt>Motivos</dt><dd>{item.reasons.map((r) => REASON_LABEL[r]).join(', ')}</dd></div>
        </dl>
        {item.notes.length > 0 && <ul className="modcard__notes">{item.notes.slice(0, 5).map((n, i) => <li key={i}>“{n}”</li>)}</ul>}
        <Excerpt kind={item.kind} s={s} />
        {!item.now && <p className="faint">Isto já não existe (a pessoa apagou ou mudou). Dá para arquivar.</p>}
        {changed && <p className="faint">Mudou desde a denúncia: acima está como está agora.</p>}
        {s?.hidden && <p className="faint">Já está fora do ar por uma decisão anterior.</p>}
        {link && <Link to={link} className="arrow-link">Abrir para conferir →</Link>}
      </div>
      <div className="modcard__act">
        <div className="seg modcard__seg" role="group" aria-label="O que fazer">
          {actions.map((a) => <button key={a} aria-pressed={action === a} onClick={() => setAction(a)}>{label(a)}</button>)}
        </div>
        {action === 'suspender' && (
          <label className="modcard__days">Por
            <select className="field" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 3, 7, 15, 30, 90].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>)}
            </select>
            <small className="faint">O perfil público sai do ar; o diário continua funcionando.</small>
          </label>
        )}
        {action !== 'arquivar' && (
          <label className="modcard__msg"><span className="kicker">Mensagem para a pessoa (opcional)</span>
            <textarea className="field" rows={2} maxLength={600} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ela vê junto com o aviso padrão, sem saber quem denunciou." />
          </label>
        )}
        <button className={`btn ${action === 'arquivar' ? 'ghost' : action === 'suspender' || action === 'trocar_arroba' ? 'danger-solid' : 'primary'}`} disabled={busy} onClick={go}>{busy ? 'Gravando…' : label(action)}</button>
      </div>
    </li>
  );
}

function Excerpt({ kind, s }: { kind: QueueItem['kind']; s: QueueItem['snapshot'] | null }) {
  if (!s) return null;
  const lines: [string, string | null | undefined][] = kind === 'perfil'
    ? [['@', s.handle], ['Bio', s.bio], ['Imagens', [s.avatar ? 'tem foto' : null, s.cover ? 'tem capa' : null].filter(Boolean).join(' e ') || null]]
    : kind === 'momento' ? [['Título', s.title], ['Frase', s.quote], ['Texto', s.text], ['Foto', s.photo ? 'sim' : null]]
    : kind === 'vitrine' ? [['Título', s.title], ['Descrição', s.description]]
    : kind === 'museu' ? [['Título', s.title], ['Apresentação', s.intro]]
    : kind === 'comunidade' ? [['Nome', s.title], ['Descrição', s.description]]
    : kind === 'postagem' ? [['Título', s.title], ['Texto', s.text], ['Jogo', s.game], ['Imagens', s.photo ? 'sim' : null]]
    : kind === 'resposta' ? [['Na postagem', s.title], ['Texto', s.text]]
    : kind === 'clube' ? [['Nome', s.title], ['Descrição', s.description], ['Jogo', s.game]]
    : kind === 'jogatina' ? [['Nome', s.title], ['Descrição', s.description], ['Jogo', s.game], ['Quando', s.startsAt ? new Date(s.startsAt).toLocaleString('pt-BR') : null]]
    : kind === 'mensagem' ? [['Para', s.to ? `@${s.to}` : null], ['Texto', s.text], ['Jogo', s.game]]
    : kind === 'lista' ? [['Título', s.title], ['Descrição', s.description], ['Jogos e notas', s.games], ['Quem vê', s.visibility]]
    : [['Jogo', s.game]];
  const shown = lines.filter(([, v]) => v);
  if (!shown.length) return null;
  return <dl className="modcard__excerpt">{shown.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

function LogRow({ l, onUndone, onError }: { l: LogItem; onUndone: () => void; onError: (e: string) => void }) {
  const [busy, setBusy] = useState(false);
  const undo = async () => {
    setBusy(true); onError('');
    try { await moderationApi.undo(l.id); onUndone(); } catch (e) { onError(e instanceof Error ? e.message : 'Não deu certo agora.'); setBusy(false); }
  };
  return (
    <li className={`modlog__row${l.undoneAt ? ' is-undone' : ''}`}>
      <span className="mono modlog__when">{when(l.at)}</span>
      <span className="modlog__what">
        <span><b>{ACTION_DONE[l.action]}</b> · {KIND_LABEL[l.kind]}{l.handle ? <> de <Link to={`/@${l.handle.toLowerCase()}`}>@{l.handle}</Link></> : ''}
        {l.until ? ` · até ${day(l.until)}` : ''}{l.reports ? ` · ${l.reports} ${l.reports === 1 ? 'denúncia' : 'denúncias'}` : ''}{l.by ? ` · por @${l.by}` : ''}</span>
        {l.message && <small className="muted">“{l.message}”</small>}
      </span>
      {l.undoneAt ? <span className="faint">Desfeito em {when(l.undoneAt)}</span>
        : l.action === 'arquivar' ? <span className="faint">—</span>
        : <button className="btn sm ghost" disabled={busy} onClick={undo}>{busy ? 'Desfazendo…' : 'Desfazer'}</button>}
    </li>
  );
}
