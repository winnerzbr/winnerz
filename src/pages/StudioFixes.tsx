import { useCallback, useEffect, useState } from 'react';
import { actions, useStore } from '../data/store';
import type { Game } from '../data/types';
import { canReview, fixesApi, QUALITY_GROUPS, type Quality, type QueueItem } from '../data/fixesApi';
import { fixLabel, showProposed, checkFix } from '../lib/fixes';
import { FixEditor, FixSheet, draftOf, type FixDraft } from '../components/FixSheet';
import { ConfirmButton } from '../components/Sheet';
import { CoverArt } from '../components/CoverArt';
import { gameBySlug, refreshGame } from '../components/AddGameDialog';
import { shortPlatform } from '../lib/platforms';
import { Link } from '../lib/router';

type Tab = 'fila' | 'revisadas' | 'qualidade';
const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').replace(/ de /g, ' ') : '');

/** Studio · Correções: a fila do "Algo errado nesta ficha?" e o painel de qualidade dos dados. Só da administração. */
export function StudioFixesPage() {
  useStore((s) => s.isAdmin);
  const mode = useStore((s) => s.mode);
  const [tab, setTab] = useState<Tab>('fila');
  const [open, setOpen] = useState<QueueItem[] | null>(null);
  const [done, setDone] = useState<QueueItem[] | null>(null);
  const [q, setQ] = useState<Quality | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (t: Tab) => {
    setErr('');
    try {
      if (t === 'fila') setOpen(await fixesApi.queue('aberta'));
      else if (t === 'revisadas') {
        const [a, r] = await Promise.all([fixesApi.queue('aceita'), fixesApi.queue('recusada')]);
        setDone([...a, ...r].sort((x, y) => (y.reviewedAt ?? '').localeCompare(x.reviewedAt ?? '')));
      } else setQ(await fixesApi.quality());
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); }
  }, []);
  useEffect(() => { if (canReview()) load(tab); }, [tab, load, mode]);
  useEffect(() => { if (canReview()) fixesApi.queue('aberta').then(setOpen).catch(() => null); }, [mode]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);

  if (!canReview()) return (
    <main className="page pad narrow">
      <h1 className="t big">Correções</h1>
      <p className="muted lead">Esta tela é só da administração do WinnerZ. Viu algo errado num jogo? Use "Algo errado nesta ficha?" na página dele.</p>
      <Link className="btn ghost" to="/jogos">Ir para Jogos</Link>
    </main>
  );

  const reviewed = (item: QueueItem, accepted: boolean) => {
    setOpen((l) => (l ?? []).filter((x) => x.id !== item.id));
    setDone(null);
    setMsg(accepted ? (item.field === 'outro' ? 'Marcada como resolvida.' : `Corrigido: ${fixLabel(item.field).toLowerCase()} de ${item.title}.`) : 'Sugestão recusada.');
  };

  return (
    <main className="page pad studio">
      <header className="studio__head">
        <Link to="/studio" className="back">← Studio</Link>
        <h1 className="t big">Correções</h1>
        <p className="muted lead">O que a comunidade apontou nas fichas e o que está faltando nos jogos que as pessoas usam.</p>
        {mode === 'demo' && <p className="faint">Na demonstração, a fila e as correções ficam só neste navegador.</p>}
      </header>
      <div className="seg studio__tabs" role="tablist" aria-label="Seções">
        <button role="tab" aria-selected={tab === 'fila'} aria-pressed={tab === 'fila'} onClick={() => setTab('fila')}>Fila{open?.length ? ` (${open.length})` : ''}</button>
        <button role="tab" aria-selected={tab === 'revisadas'} aria-pressed={tab === 'revisadas'} onClick={() => setTab('revisadas')}>Revisadas</button>
        <button role="tab" aria-selected={tab === 'qualidade'} aria-pressed={tab === 'qualidade'} onClick={() => setTab('qualidade')}>Qualidade dos dados</button>
      </div>
      {msg && <p className="studio__msg" role="status">{msg}</p>}
      {err && <p className="awards__error" role="alert">{err}</p>}

      {tab === 'fila' && (open == null ? <p className="faint">Carregando…</p> : open.length === 0 ? (
        <div className="studio__empty"><b>Fila vazia.</b><p className="muted">Quando alguém usar "Algo errado nesta ficha?", a sugestão aparece aqui.</p></div>
      ) : (
        <ul className="studio__list">{open.map((it) => <ReviewCard key={it.id} item={it} onDone={(a) => reviewed(it, a)} onError={setErr} />)}</ul>
      ))}

      {tab === 'revisadas' && (done == null ? <p className="faint">Carregando…</p> : done.length === 0 ? <p className="muted">Nada revisado ainda.</p> : (
        <ul className="studio__done">
          {done.map((it) => <DoneRow key={it.id} item={it} onUndone={() => { setMsg('Correção desfeita: a ficha voltou ao que o IGDB diz.'); load('revisadas'); }} onError={setErr} />)}
        </ul>
      ))}

      {tab === 'qualidade' && (q == null ? <p className="faint">Carregando…</p> : <QualityPanel q={q} reload={() => load('qualidade')} setMsg={setMsg} />)}
    </main>
  );
}

/** O que mudou, lado a lado. */
function Diff({ item }: { item: QueueItem }) {
  const f = item.field;
  if (f === 'outro') return null;
  if (f === 'platforms') {
    const now = (Array.isArray(item.current) ? item.current : []) as string[];
    const want = (Array.isArray(item.proposed) ? item.proposed : []) as string[];
    return (
      <div className="sdiff sdiff--chips">
        {[...new Set([...now, ...want])].map((p) => (
          <span key={p} className={`sdiff__chip${!now.includes(p) ? ' is-add' : !want.includes(p) ? ' is-del' : ''}`}>{!now.includes(p) ? '+ ' : !want.includes(p) ? '− ' : ''}{shortPlatform(p)}</span>
        ))}
      </div>
    );
  }
  if (f === 'cover') return (
    <div className="sdiff sdiff--cover">
      <figure><img src={String(item.current ?? '')} alt="" /><figcaption className="faint">Agora</figcaption></figure>
      <span aria-hidden="true">→</span>
      <figure><img src={String(item.proposed ?? '')} alt="" /><figcaption className="faint">Sugerida</figcaption></figure>
    </div>
  );
  return (
    <div className={`sdiff${f === 'summary' ? ' sdiff--long' : ''}`}>
      <div><span className="kicker">Agora</span><p>{showProposed(item.current) || <i className="faint">vazio</i>}</p></div>
      <div className="sdiff__new"><span className="kicker">Sugerido</span><p>{showProposed(item.proposed)}</p></div>
    </div>
  );
}

function ReviewCard({ item, onDone, onError }: { item: QueueItem; onDone: (accepted: boolean) => void; onError: (e: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState<FixDraft>(() => draftOf(item.game, item.field, item.proposed));
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (accept: boolean) => {
    let v: unknown = null;
    if (accept && edit && item.field !== 'outro') {
      const c = checkFix(item.field, value, item.game);
      if ('error' in c) { onError(c.error); return; }
      v = c.value;
    }
    setBusy(true);
    try { await fixesApi.review(item, accept, v, reply.trim()); onDone(accept); }
    catch (e) { onError(e instanceof Error ? e.message : 'Não deu certo agora.'); setBusy(false); }
  };
  return (
    <li className="scard">
      <Link to={`/jogos/${item.slug}`} className="scard__cover" aria-label={item.title}><CoverArt game={{ title: item.title, cover: item.cover ?? '' }} /></Link>
      <div className="scard__body">
        <div className="scard__top">
          <span className="scard__field">{fixLabel(item.field)}</span>
          <Link to={`/jogos/${item.slug}`} className="scard__title">{item.title}</Link>
        </div>
        <small className="faint">{item.handle ? `@${item.handle}` : 'Alguém'} · {when(item.createdAt)}{item.sameOpen > 0 ? ` · mais ${item.sameOpen} ${item.sameOpen === 1 ? 'pessoa sugeriu' : 'pessoas sugeriram'} o mesmo campo` : ''}</small>
        <Diff item={item} />
        {item.note && <blockquote className="scard__note">{item.note}</blockquote>}
        {item.source && <a className="scard__src" href={item.source} target="_blank" rel="noopener noreferrer nofollow">Fonte: {item.source.replace(/^https?:\/\//, '').slice(0, 60)}</a>}
        {edit && item.field !== 'outro' && (
          <div className="scard__edit"><span className="kicker">Ajustar antes de aceitar</span><FixEditor game={item.game} field={item.field} value={value} onChange={setValue} id={`ed-${item.id}`} /></div>
        )}
        <input className="field scard__reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={400} placeholder="Resposta para quem sugeriu (opcional)" aria-label="Resposta para quem sugeriu" />
        <div className="scard__acts">
          <button className="btn primary sm" disabled={busy} onClick={() => act(true)}>{item.field === 'outro' ? 'Marcar como resolvida' : 'Aceitar e corrigir'}</button>
          <button className="btn ghost sm" disabled={busy} onClick={() => act(false)}>Recusar</button>
          {item.field !== 'outro' && <button className="btn quiet sm" aria-pressed={edit} onClick={() => setEdit((x) => !x)}>{edit ? 'Usar o sugerido' : 'Ajustar'}</button>}
        </div>
      </div>
    </li>
  );
}

function DoneRow({ item, onUndone, onError }: { item: QueueItem; onUndone: () => void; onError: (e: string) => void }) {
  const live = useStore((s) => s.games[item.gameId]);
  const fixes = (live ?? item.game).fixes ?? {};
  const still = item.status === 'aceita' && item.field !== 'outro' && !!fixes[item.field];
  return (
    <li className="sdone">
      <span className={`fixs__st fixs__st--${item.status}`}>{item.status === 'aceita' ? 'Aceita' : 'Recusada'}</span>
      <span className="sdone__t"><Link to={`/jogos/${item.slug}`}>{item.title}</Link> · <b>{fixLabel(item.field)}</b>{item.field !== 'outro' && <span className="muted"> → {showProposed(item.proposed).slice(0, 90)}</span>}</span>
      <small className="faint">{when(item.reviewedAt)}{item.reply ? ` · "${item.reply}"` : ''}</small>
      {still && <ConfirmButton className="btn quiet sm" label="Desfazer correção" confirm="Toque de novo para desfazer" onConfirm={() => fixesApi.unfix(item.gameId, item.field).then(onUndone).catch((e) => onError(e instanceof Error ? e.message : 'Não deu certo.'))} />}
    </li>
  );
}

function QualityPanel({ q, reload, setMsg }: { q: Quality; reload: () => void; setMsg: (m: string) => void }) {
  const games = useStore((s) => s.games);
  const first = QUALITY_GROUPS.find((g) => q.groups[g.k]?.total)?.k ?? 'sinopse_em_ingles';
  const [group, setGroup] = useState(first);
  const [busy, setBusy] = useState<string | null>(null);
  const [fixing, setFixing] = useState<Game | null>(null);
  const cur = q.groups[group];
  const meta = QUALITY_GROUPS.find((g) => g.k === group)!;

  const refresh = async (id: string, igdbId: number, title: string) => {
    setBusy(id);
    const g = await refreshGame(igdbId);
    if (g) { actions.mergeGames([g]); setMsg(`${title} atualizado a partir do IGDB.`); reload(); }
    else setMsg(`Não consegui atualizar ${title} agora.`);
    setBusy(null);
  };
  const openFix = async (id: string, slug: string) => {
    setBusy(id);
    const g = games[id] ?? (await gameBySlug(slug));
    if (g) { if (!games[id]) actions.mergeGames([g]); setFixing(g); } else setMsg('Essa ficha não abriu agora.');
    setBusy(null);
  };

  return (
    <div className="squal">
      <div className="squal__nums">
        <div><b>{q.inUse}</b><span className="faint">jogos em uso</span></div>
        <div><b>{q.openQueue}</b><span className="faint">sugestões na fila</span></div>
        <div><b>{q.inUse ? Math.round(100 * (1 - new Set(Object.entries(q.groups).filter(([k]) => k !== 'corrigidos' && k !== 'fora_do_igdb').flatMap(([, v]) => v.items.map((x) => x.id))).size / q.inUse)) : 100}%</b><span className="faint">fichas completas</span></div>
      </div>
      <div className="squal__groups" role="tablist" aria-label="Problemas">
        {QUALITY_GROUPS.map((g) => (
          <button key={g.k} role="tab" aria-selected={group === g.k} className={`squal__g${group === g.k ? ' is-on' : ''}${q.groups[g.k]?.total ? '' : ' is-zero'}`} onClick={() => setGroup(g.k)}>
            <b>{q.groups[g.k]?.total ?? 0}</b><span>{g.label}</span>
          </button>
        ))}
      </div>
      <p className="muted squal__hint">{meta.hint}{cur && cur.total > cur.items.length ? ` Mostrando os ${cur.items.length} mais usados.` : ''}</p>
      {!cur?.items.length ? <p className="faint">Nenhuma ficha aqui. 🎉</p> : (
        <ul className="squal__list">
          {cur.items.map((it) => (
            <li key={it.id}>
              <span className="squal__cover"><CoverArt game={{ title: it.title, cover: it.cover ?? '' }} /></span>
              <span className="squal__t"><Link to={`/jogos/${it.slug}`}>{it.title}</Link><small className="faint">{[it.year, `${it.uses} ${it.uses === 1 ? 'uso' : 'usos'}`].filter(Boolean).join(' · ')}</small></span>
              <span className="squal__acts">
                {it.igdbId && group !== 'corrigidos' && <button className="btn quiet sm" disabled={busy === it.id} onClick={() => refresh(it.id, it.igdbId!, it.title)}>Atualizar do IGDB</button>}
                {it.igdbId ? <button className="btn ghost sm" disabled={busy === it.id} onClick={() => openFix(it.id, it.slug)}>Corrigir</button> : <Link className="btn ghost sm" to={`/jogos/${it.slug}`}>Abrir</Link>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {fixing && <FixSheet game={fixing} onClose={() => { setFixing(null); reload(); }} />}
    </div>
  );
}
