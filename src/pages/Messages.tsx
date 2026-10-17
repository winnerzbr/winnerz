/**
 * Mensagens diretas (Comunidade, entrega E): a lista de conversas, os pedidos e a conversa aberta.
 * No computador, lista e conversa lado a lado; no celular, uma tela de cada vez.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PresencePill } from '../components/Presence';
import { usePresenceOf } from '../data/presenceApi';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { dmApi, type DmMessage, type DmOpen, type DmThreadRow } from '../data/dmApi';
import { moderationApi } from '../data/moderationApi';
import { ReportButton } from '../components/Moderation';
import { PersonAvatar, PostText, ago } from '../components/Posts';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { track } from '../lib/track';
import type { Game } from '../data/types';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');
const hm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso: string) => {
  const d = new Date(iso), t = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, t)) return 'Hoje';
  const y = new Date(t); y.setDate(t.getDate() - 1);
  if (same(d, y)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: d.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
};

/** Contador de não lidas (para o topo e a barra do celular): atualiza a cada minuto e ao voltar para a aba. */
let timer: ReturnType<typeof setInterval> | null = null;
export function useDmUnread() {
  const signed = useStore((s) => s.mode === 'demo' || !!s.profile);
  const v = useSyncExternalStore(dmApi.subscribe, dmApi.peekUnread, dmApi.peekUnread);
  useEffect(() => {
    if (!signed) return;
    void dmApi.unread();
    if (!timer) {
      timer = setInterval(() => { if (document.visibilityState === 'visible') void dmApi.unread(); }, 60_000);
      window.addEventListener('focus', () => void dmApi.unread());
    }
  }, [signed]);
  return signed ? v : { unread: 0, requests: 0 };
}

/** O ícone de mensagens no topo, com o número de conversas não lidas e pedidos. */
export function DmButton() {
  const signed = useStore((s) => s.mode === 'demo' || !!s.profile);
  const { unread, requests } = useDmUnread();
  if (!signed) return null;
  const n = unread + requests;
  return (
    <Link to="/mensagens" className="icon-btn notif-bell__btn dm-btn" aria-label={n ? `Mensagens: ${n} ${n === 1 ? 'nova' : 'novas'}` : 'Mensagens'} title="Mensagens">
      <Icon name="mensagem" size={20} />
      {n > 0 && <span className="notif-bell__n">{n > 9 ? '9+' : n}</span>}
    </Link>
  );
}

/** "Mensagem" no perfil e na lista de pessoas. */
export function MessageButton({ handle, className = 'btn ghost' }: { handle: string; className?: string }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  return <button className={className} onClick={() => navigate(signedOut ? '/entrar' : `/mensagens/${encodeURIComponent(handle)}`)}><Icon name="mensagem" size={15} />Mensagem</button>;
}

export function MessagesPage({ handle }: { handle?: string }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [rows, setRows] = useState<DmThreadRow[] | null>(null);
  const [tab, setTab] = useState<'conversas' | 'pedidos'>('conversas');
  const [err, setErr] = useState('');
  const load = useCallback(async () => { try { setRows(await dmApi.list()); setErr(''); } catch (e) { setErr(errOf(e)); setRows([]); } }, []);
  useEffect(() => { if (!signedOut) void load(); track('mensagens.abrir'); }, [load, signedOut]);
  // Ao ler uma conversa (dmApi.read avisa), a lista atualiza e o selo de não lida some.
  useEffect(() => dmApi.subscribe(() => { if (!signedOut) void load(); }), [load, signedOut]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 20_000);
    return () => clearInterval(t);
  }, [load]);
  // No computador, sem conversa aberta, abre a mais recente (no celular a lista vem primeiro).
  useEffect(() => {
    if (handle || !rows?.length || !window.matchMedia('(min-width: 861px)').matches) return;
    const first = rows.find((r) => r.pending !== 'recebido' && r.person.handle);
    if (first) navigate(`/mensagens/${encodeURIComponent(first.person.handle!)}`, { replace: true });
  }, [rows, handle]);
  if (signedOut) return <main className="page pad"><h1 className="t big">Mensagens</h1><p className="muted">Entre na sua conta para conversar. <Link to="/entrar">Entrar</Link></p></main>;
  const reqs = (rows ?? []).filter((r) => r.pending === 'recebido');
  const convs = (rows ?? []).filter((r) => r.pending !== 'recebido');
  const list = tab === 'pedidos' ? reqs : convs;
  return (
    <main className={`page pad dm${handle ? ' has-open' : ''}`}>
      <header className="page-head dm__head">
        <div className="page-head__text"><h1 className="t big">Mensagens</h1></div>
      </header>
      <div className="dm__grid">
        <aside className="dm__side card" aria-label="Conversas">
          <div role="tablist" className="what__paths dm__tabs">
            <button role="tab" aria-selected={tab === 'conversas'} onClick={() => setTab('conversas')}>Conversas</button>
            <button role="tab" aria-selected={tab === 'pedidos'} onClick={() => setTab('pedidos')}>Pedidos{reqs.length ? <span className="what__badge">{reqs.length}</span> : null}</button>
          </div>
          {err && <p className="awards__error" role="alert">{err}</p>}
          {rows === null ? <p className="muted dm__empty">Carregando…</p> : list.length === 0 ? (
            <p className="muted dm__empty">{tab === 'pedidos' ? 'Nenhum pedido. Quem não está liberado a te escrever aparece aqui primeiro.' : <>Nenhuma conversa ainda. Comece pelo botão <b>Mensagem</b> no perfil de alguém ou em <Link to="/comunidade/pessoas">Pessoas</Link>.</>}</p>
          ) : (
            <ul className="dm__list">
              {list.map((r) => (
                <li key={r.id}>
                  <Link to={`/mensagens/${encodeURIComponent(r.person.handle ?? '')}`} className={`dm__row${r.person.handle && handle && r.person.handle.toLowerCase() === handle.toLowerCase() ? ' is-on' : ''}${r.unread ? ' is-unread' : ''}`}>
                    <PersonAvatar p={r.person} size={40} />
                    <span className="dm__row-t">
                      <span className="dm__row-top"><b>@{r.person.handle ?? 'conta apagada'}</b><span className="faint">{ago(r.last?.at ?? r.lastAt)}</span></span>
                      <span className="dm__row-last">
                        {r.pending === 'enviado' ? <em>Pedido enviado</em> : r.last ? <>{r.last.mine ? 'Você: ' : ''}{r.last.deleted ? <em>mensagem apagada</em> : r.last.body || (r.last.game ? `🎮 ${r.last.game}` : '')}</> : null}
                      </span>
                    </span>
                    {r.muted && <span className="faint dm__muted" title="Conversa silenciada"><Icon name="sino" size={13} /></span>}
                    {r.unread > 0 && <span className="dm__dot" aria-label={`${r.unread} não lidas`}>{r.unread > 9 ? '9+' : r.unread}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="faint dm__privacy">Quem pode te escrever: <Link to="/preferencias#comunidade">Preferências</Link>.</p>
        </aside>
        <section className="dm__main card" aria-label="Conversa">
          {handle ? <Conversation key={handle} handle={handle} onChanged={load} /> : <div className="dm__none"><Icon name="mensagem" size={28} /><p className="muted">Escolha uma conversa ao lado.</p></div>}
        </section>
      </div>
    </main>
  );
}

function Conversation({ handle, onChanged }: { handle: string; onChanged: () => Promise<void> }) {
  const [c, setC] = useState<DmOpen | null>(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<DmMessage | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [picking, setPicking] = useState(false);
  const [menu, setMenu] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);
  const load = useCallback(async () => {
    try {
      const o = await dmApi.open(handle);
      setC(o); setErr('');
      const last = o.messages.at(-1)?.id ?? null;
      if (o.thread && last !== lastId.current) { lastId.current = last; void dmApi.read(o.thread); setTimeout(() => bottom.current?.scrollIntoView({ block: 'end' }), 30); }
    } catch (e) { setErr(errOf(e)); }
  }, [handle]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 6_000);
    return () => clearInterval(t);
  }, [load]);

  if (err && !c) return <div className="dm__none"><p className="awards__error">{err}</p><Link to="/mensagens" className="btn quiet sm">Voltar</Link></div>;
  if (!c) return <div className="dm__none"><p className="muted">Carregando…</p></div>;
  const send = async () => {
    if (!text.trim() && !game) return;
    setBusy(true); setErr('');
    try {
      await dmApi.send(handle, text, game?.id, reply?.id);
      track('mensagens.enviar');
      setText(''); setReply(null); setGame(null); lastId.current = null;
      await load(); await onChanged();
    } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const answer = async (accept: boolean) => {
    try { await dmApi.answer(c.thread!, accept); await onChanged(); if (accept) await load(); else navigate('/mensagens'); } catch (e) { setErr(errOf(e)); }
  };
  const block = async () => {
    if (!window.confirm(`Bloquear @${handle}? Vocês deixam de se seguir e a conversa para nos dois lados.`)) return;
    try { await moderationApi.block(handle, 'bloquear'); await onChanged(); await load(); setMenu(false); } catch (e) { setErr(errOf(e)); }
  };
  const lastMine = [...c.messages].reverse().find((m) => m.mine && !m.deleted);
  const canWrite = c.can === 'ok' || c.can === 'pedido';
  let lastDay = '';
  return (
    <div className="dm__conv">
      <header className="dm__conv-head">
        <Link to="/mensagens" className="icon-btn dm__back" aria-label="Voltar às conversas"><Icon name="voltar" size={18} /></Link>
        <PersonAvatar p={c.person} size={36} />
        <span className="dm__conv-who"><Link to={`/@${c.person.handle}`}><b>@{c.person.handle}</b></Link>{c.muted && <span className="faint"> · silenciada</span>}<ConvPresence handle={handle} /></span>
        {c.thread && (
          <span className="dm__conv-menu">
            <button className="icon-btn" aria-label="Opções da conversa" aria-expanded={menu} onClick={() => setMenu(!menu)}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
            {menu && (
              <div className="dm__pop" role="menu">
                <button role="menuitem" onClick={async () => { await dmApi.set(c.thread!, { muted: !c.muted }); setMenu(false); await load(); await onChanged(); }}>{c.muted ? 'Voltar a avisar' : 'Silenciar a conversa'}</button>
                <button role="menuitem" onClick={async () => { if (!window.confirm('Apagar esta conversa só para você? A outra pessoa continua vendo.')) return; await dmApi.set(c.thread!, { clear: true }); setMenu(false); await onChanged(); navigate('/mensagens'); }}>Apagar a conversa para mim</button>
                <button role="menuitem" className="is-danger" onClick={() => void block()}>Bloquear @{handle}</button>
              </div>
            )}
          </span>
        )}
      </header>
      <div className="dm__msgs" aria-live="polite">
        {c.messages.length === 0 && <p className="muted dm__start">{c.can === 'pedido' ? `@${handle} ainda não te liberou para mensagens. A primeira vai como pedido: só uma, até a pessoa aceitar.` : `Comece a conversa com @${handle}.`}</p>}
        {c.messages.map((m) => {
          const d = dayLabel(m.at); const showDay = d !== lastDay; lastDay = d;
          return (
            <div key={m.id}>
              {showDay && <div className="dm__day"><span>{d}</span></div>}
              <Bubble m={m} handle={handle} thread={c.thread!} onReply={() => setReply(m)} onChanged={load} seen={!!(m.id === lastMine?.id && c.seenAt && c.seenAt >= m.at)} />
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {c.pending === 'recebido' ? (
        <div className="dm__request">
          <p><b>@{handle}</b> quer conversar com você. Responder ou aceitar libera a conversa; recusar não avisa a pessoa.</p>
          <div className="dm__request-acts">
            <button className="btn primary sm" onClick={() => void answer(true)}>Aceitar</button>
            <button className="btn ghost sm" onClick={() => void answer(false)}>Recusar</button>
            <button className="btn quiet sm" onClick={() => void block()}>Bloquear</button>
          </div>
        </div>
      ) : null}
      {c.can === 'aguardando' && <p className="dm__note muted">Pedido enviado. Você pode mandar mais quando @{handle} aceitar ou responder.</p>}
      {c.can === 'fechado' && <p className="dm__note muted">@{handle} não está recebendo mensagens novas.</p>}
      {c.can === 'bloqueado' && <p className="dm__note muted">Não dá para conversar com este perfil.</p>}
      {canWrite && c.pending !== 'recebido' && (
        <div className="dm__compose">
          {(reply || game) && (
            <div className="dm__attach">
              {reply && <span className="dm__attach-item"><Icon name="citar" size={13} />Respondendo: “{reply.body.slice(0, 60)}{reply.body.length > 60 ? '…' : ''}”<button className="icon-btn" aria-label="Tirar a resposta" onClick={() => setReply(null)}><Icon name="fechar" size={12} /></button></span>}
              {game && <span className="dm__attach-item"><Icon name="jogos" size={13} />{game.title}<button className="icon-btn" aria-label="Tirar o jogo" onClick={() => setGame(null)}><Icon name="fechar" size={12} /></button></span>}
            </div>
          )}
          <div className="dm__compose-row">
            <button className="icon-btn" aria-label="Compartilhar um jogo" title="Compartilhar um jogo" onClick={() => setPicking(true)}><Icon name="jogos" size={18} /></button>
            <textarea className="field" rows={1} maxLength={4000} value={text} placeholder={c.can === 'pedido' ? 'Seu pedido (uma mensagem)' : `Mensagem para @${handle}`} aria-label="Mensagem"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} />
            <button className="btn primary sm" disabled={busy || (!text.trim() && !game)} onClick={() => void send()}>{busy ? '…' : 'Enviar'}</button>
          </div>
          <small className="faint dm__hint">Enter envia · Shift+Enter quebra a linha · **negrito**, ||spoiler||</small>
        </div>
      )}
      {err && <p className="awards__error dm__err" role="alert">{err}</p>}
      {picking && <GamePicker onPick={(g) => { setGame(g); setPicking(false); }} onClose={() => setPicking(false)} />}
    </div>
  );
}

function Bubble({ m, handle, thread, onReply, onChanged, seen }: { m: DmMessage; handle: string; thread: string; onReply: () => void; onChanged: () => Promise<void>; seen: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.body);
  const [err, setErr] = useState('');
  const editable = m.mine && !m.deleted && Date.now() - Date.parse(m.at) < 15 * 60_000;
  if (m.deleted) return <div className={`dm__b${m.mine ? ' is-mine' : ''} is-deleted`}><p className="faint">Mensagem apagada.</p></div>;
  const save = async () => { try { await dmApi.edit(m.id, text, thread); setEditing(false); await onChanged(); } catch (e) { setErr(errOf(e)); } };
  const del = async () => { if (!window.confirm('Apagar esta mensagem para os dois?')) return; try { await dmApi.remove(m.id, thread); await onChanged(); } catch (e) { setErr(errOf(e)); } };
  return (
    <div className={`dm__b${m.mine ? ' is-mine' : ''}${m.hidden ? ' is-hidden' : ''}`} id={`dm-${m.id}`}>
      <div className="dm__bubble">
        {m.replyTo && <div className="dm__quote">{m.replyTo.deleted ? <em>mensagem apagada</em> : <>{m.replyTo.mine ? 'Você' : `@${handle}`}: {m.replyTo.body}</>}</div>}
        {editing ? (
          <div className="dm__edit">
            <textarea className="field" rows={2} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} />
            <span><button className="btn quiet sm" onClick={() => { setEditing(false); setText(m.body); }}>Cancelar</button><button className="btn primary sm" disabled={!text.trim()} onClick={() => void save()}>Salvar</button></span>
          </div>
        ) : m.body ? <PostText text={m.body} embeds={1} /> : null}
        {m.game && (
          <Link to={`/jogos/${m.game.slug}`} className="dm__game">
            <CoverArt game={{ title: m.game.title, cover: m.game.cover ?? '' }} />
            <span><b>{m.game.title}</b>{m.game.year ? <span className="faint">{m.game.year}</span> : null}<span className="dm__game-cta">Ver a ficha</span></span>
          </Link>
        )}
        {m.hidden && <span className="cm-chip cm-chip--hidden">Fora do ar pela moderação</span>}
      </div>
      <div className="dm__meta">
        <span className="faint">{hm(m.at)}{m.editedAt ? ' · editada' : ''}{seen ? ' · visto' : ''}</span>
        <button className="cm-link" onClick={onReply}>Responder</button>
        {editable && !editing && <button className="cm-link" onClick={() => setEditing(true)}>Editar</button>}
        {m.mine && <button className="cm-link" onClick={() => void del()}>Apagar</button>}
        {!m.mine && <ReportButton kind="mensagem" handle={handle} refId={m.id} snapshot={{ title: 'Mensagem direta', text: m.body.slice(0, 400) }} what={`Uma mensagem de @${handle} para você.`} className="cm-link" />}
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}

/** Escolher um jogo para mandar como cartão: os da sua coleção e da sua Jornada primeiro. */
function GamePicker({ onPick, onClose }: { onPick: (g: Game) => void; onClose: () => void }) {
  const s = useStore((x) => x);
  const [q, setQ] = useState('');
  const mine = useMemo(() => {
    const ids = new Set([...s.journeys.map((j) => j.gameId), ...s.copies.map((c) => c.gameId), ...s.wishes.map((w) => w.gameId)]);
    return [...ids].map((id) => s.games[id]).filter((g): g is Game => !!g).sort((a, b) => a.title.localeCompare(b.title));
  }, [s]);
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = mine.filter((g) => !q.trim() || norm(g.title).includes(norm(q))).slice(0, 40);
  return (
    <Sheet title="Compartilhar um jogo" onClose={onClose} labelId="dm-game">
      <input className="field" autoFocus placeholder="Buscar na sua coleção, Jornada e desejos" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar jogo" />
      <ul className="dm__picker">
        {list.map((g) => <li key={g.id}><button onClick={() => onPick(g)}><CoverArt game={g} /><span>{g.title}{g.year ? <span className="faint"> · {g.year}</span> : null}</span></button></li>)}
        {list.length === 0 && <li className="muted">Nada com esse nome entre os seus jogos.</li>}
      </ul>
    </Sheet>
  );
}

function ConvPresence({ handle }: { handle: string }) {
  const p = usePresenceOf(handle);
  return p ? <span className="dm__presence"><PresencePill p={p} /></span> : null;
}
