/**
 * Aba "Trocas": trocas sugeridas (o que sobra para um falta para o outro), propor uma troca a um @, propostas
 * recebidas e enviadas, e o histórico. Só repetidas entram (cada um fica sempre com uma cópia) e Lendárias ficam
 * fora. No aceite, as cartas se cruzam e as recebidas vão para a bandeja do álbum.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from '../../lib/router';
import { tradeApi, type AlbumBook as Book, type AlbumState, type Sticker, type Trade, type TradeBoard, type TradeMatch, type TradePeer } from '../../data/albumApi';
import { spares, TIER_LABEL, TRADE_MAX, tradeBalance, tradeableTier, tradeSuggest } from '../../lib/album';
import { Avatar } from '../Social';
import { num3 } from './render';
import { burst, GOLD, reduceMotion, sfx } from './fx';
import { StickerView } from './StickerView';

const WHY: Record<string, string> = {
  trade_self: 'Essa é a sua conta.',
  trade_closed: 'Essa pessoa não está aceitando propostas de troca agora.',
  trade_new_other: 'Essa conta é nova e ainda não pode trocar (libera 7 dias depois de criada).',
};
const STATE_LABEL: Record<Trade['state'], string> = { aberta: 'Em aberto', aceita: 'Feita', recusada: 'Recusada', cancelada: 'Cancelada', expirada: 'Expirou', falhou: 'Não deu certo' };
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
const left = (iso: string) => { const d = Math.ceil((Date.parse(iso) - Date.now()) / 86400_000); return d <= 1 ? 'expira hoje' : `expira em ${d} dias`; };
const msgOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora. Tente de novo.');

export function Trades({ state, section, bookOf, start }: { state: AlbumState; section: Record<string, string>; bookOf: Record<string, Book>; start?: string }) {
  const byId = useMemo(() => Object.fromEntries(state.stickers.map((s) => [s.id, s])), [state.stickers]);
  const items = useMemo(() => Object.fromEntries(state.items.map((i) => [i.id, i])), [state.items]);
  const [board, setBoard] = useState<TradeBoard | null>(null);
  const [matches, setMatches] = useState<TradeMatch[] | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [compose, setCompose] = useState<{ peer: TradePeer; give: string[]; take: string[] } | null>(null);
  const [swap, setSwap] = useState<{ give: Sticker[]; take: Sticker[]; who: string } | null>(null);

  const load = () => Promise.all([tradeApi.board(), tradeApi.matches()]).then(([b, m]) => { setBoard(b); setMatches(m); }).catch((e) => setErr(msgOf(e)));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (start) void openPeer(start); }, [start]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = (ids: string[]) => ids.map((id) => byId[id]).filter(Boolean) as Sticker[];
  const blocked = !!board?.newUntil;

  async function openPeer(handle: string, give: string[] = [], take: string[] = []) {
    if (!handle.trim()) return;
    setErr(''); setNote(''); setBusy('peer');
    try {
      const peer = await tradeApi.peer(handle);
      setCompose({ peer, give, take });
      setTimeout(() => document.getElementById('troca-montar')?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }), 60);
    } catch (e) { setErr(msgOf(e)); } finally { setBusy(''); }
  }
  async function send(handle: string, give: string[], take: string[], message: string) {
    setErr(''); setNote(''); setBusy('send');
    try {
      await tradeApi.propose(handle, give, take, message);
      setCompose(null); setNote(`Proposta enviada para @${handle}. Você recebe um aviso quando a pessoa responder.`); sfx('card');
      await load();
    } catch (e) { setErr(msgOf(e)); } finally { setBusy(''); }
  }
  async function answer(t: Trade, accept: boolean) {
    setErr(''); setNote(''); setBusy(t.id);
    try {
      const r = await tradeApi.answer(t.id, accept);
      if (r.state === 'aceita') setSwap({ give: list(t.take), take: list(t.give), who: t.from?.handle ?? '' });
      else if (r.state === 'falhou') setErr('Uma das figurinhas deixou de ser repetida antes do aceite, então a troca não aconteceu. Nada mudou nas coleções.');
      else setNote('Proposta recusada.');
      await load();
    } catch (e) { setErr(msgOf(e)); } finally { setBusy(''); }
  }
  async function cancel(t: Trade) {
    setErr(''); setBusy(t.id);
    try { await tradeApi.cancel(t.id); setNote('Proposta cancelada.'); await load(); } catch (e) { setErr(msgOf(e)); } finally { setBusy(''); }
  }
  async function toggle(open: boolean) {
    if (!board) return; setBoard({ ...board, open });
    try { await tradeApi.setOpen(open); } catch (e) { setErr(msgOf(e)); setBoard({ ...board }); }
  }

  if (!board || !matches) return err ? <p className="awards__error" role="alert">{err}</p> : <p className="faint">Abrindo as trocas…</p>;
  const firstBook = state.books.find((b) => b.published);
  return (
    <div className="alb-trades">
      <section className="alb-trades__top">
        <label className="alb-switch">
          <input type="checkbox" checked={board.open} onChange={(e) => void toggle(e.target.checked)} />
          <span className="alb-switch__ui" aria-hidden="true" />
          <span><b>Aceito propostas de troca</b><small>{board.open ? 'Você aparece nas sugestões de quem tem o que falta para você.' : 'Desligado: você não aparece nas sugestões e não recebe propostas.'}</small></span>
        </label>
        <form className="alb-trades__find" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('h'); void openPeer(String(v ?? '')); }}>
          <label htmlFor="troca-h" className="faint">Propor troca para</label>
          <div className="alb-trades__findrow">
            <input id="troca-h" name="h" className="field" placeholder="@pessoa" defaultValue={start ?? ''} autoComplete="off" disabled={blocked} />
            <button className="btn ghost" disabled={busy === 'peer' || blocked}>{busy === 'peer' ? 'Procurando…' : 'Montar troca'}</button>
          </div>
        </form>
      </section>
      {blocked && <p className="alb-note"><span><b>Sua conta pode trocar a partir de {day(board.newUntil!)}.</b> <span className="muted">Contas novas esperam 7 dias antes da primeira troca.</span></span></p>}
      {err && <p className="awards__error" role="alert">{err}</p>}
      {note && <p className="alb-trades__ok" role="status">{note}</p>}

      {compose && <Composer key={compose.peer.person.id} c={compose} byId={byId} items={items} section={section} busy={busy === 'send'} onClose={() => setCompose(null)} onSend={(g, t, m) => void send(compose.peer.person.handle ?? '', g, t, m)} />}

      {board.received.length > 0 && (
        <section className="alb-trades__sec">
          <h2 className="t">Recebidas</h2>
          <ul className="alb-trades__list">{board.received.map((t) => (
            <TradeCard key={t.id} t={t} byId={byId} section={section}>
              <button className="btn now sm" disabled={!!busy || blocked} onClick={() => void answer(t, true)}>{busy === t.id ? 'Trocando…' : 'Aceitar'}</button>
              <button className="btn quiet sm" disabled={!!busy} onClick={() => void answer(t, false)}>Recusar</button>
            </TradeCard>))}</ul>
        </section>
      )}

      <section className="alb-trades__sec">
        <h2 className="t">Trocas sugeridas</h2>
        <p className="muted alb-trades__lead">Pessoas com repetidas que faltam para você e que precisam de repetidas suas. Amigos aparecem primeiro.</p>
        {matches.length === 0
          ? <p className="faint">Nenhuma troca encaixa agora. Abra pacotes ou espere mais pessoas colecionarem: as sugestões mudam a cada figurinha.</p>
          : <ul className="alb-trades__list">{matches.map((m) => <MatchCard key={m.person.id} m={m} byId={byId} section={section} busy={!!busy} blocked={blocked}
            onSend={(g, t) => void send(m.person.handle ?? '', g, t, '')} onAdjust={(g, t) => void openPeer(m.person.handle ?? '', g, t)} />)}</ul>}
      </section>

      {board.sent.length > 0 && (
        <section className="alb-trades__sec">
          <h2 className="t">Enviadas</h2>
          <ul className="alb-trades__list">{board.sent.map((t) => (
            <TradeCard key={t.id} t={t} byId={byId} section={section}>
              <button className="btn quiet sm" disabled={!!busy} onClick={() => void cancel(t)}>{busy === t.id ? 'Cancelando…' : 'Cancelar'}</button>
            </TradeCard>))}</ul>
        </section>
      )}

      {board.history.length > 0 && (
        <section className="alb-trades__sec">
          <h2 className="t">Histórico</h2>
          <ul className="alb-trades__hist">{board.history.map((t) => {
            const other = t.mine ? t.to : t.from; const got = t.mine ? t.take : t.give; const gave = t.mine ? t.give : t.take;
            return (
              <li key={t.id}>
                <span className={`alb-tag${t.state === 'aceita' ? ' alb-tag--ok' : ''}`}>{STATE_LABEL[t.state]}</span>
                <span>{t.mine ? 'Você propôs a' : 'Proposta de'} <b>@{other?.handle ?? 'alguém'}</b> · {day(t.decidedAt ?? t.createdAt)}</span>
                <span className="faint">{t.state === 'aceita' ? `recebeu ${got.length}, deu ${gave.length}` : `${got.length} por ${gave.length}`}</span>
              </li>
            );
          })}</ul>
        </section>
      )}

      {swap && <SwapFx swap={swap} section={section} book={firstBook && swap.take[0] ? bookOf[swap.take[0].id] ?? firstBook : firstBook} onClose={() => setSwap(null)} />}
    </div>
  );
}

function Minis({ list, section, label }: { list: Sticker[]; section: Record<string, string>; label: string }) {
  return (
    <div className="alb-trades__side">
      <span className="alb-kick">{label}</span>
      <div className="alb-trades__minis">{list.map((s) => <div key={s.id} className="alb-trades__mini" title={`${num3(s.number)} · ${s.name} (${TIER_LABEL[s.tier]})`}><StickerView s={s} section={section[s.id]} /></div>)}</div>
      <small className="faint">{list.map((s) => s.name).join(' · ')}</small>
    </div>
  );
}

function Who({ p, extra }: { p: { handle: string | null; avatar?: string | null } | null; extra?: string }) {
  return (
    <div className="alb-trades__who">
      <Avatar handle={p?.handle ?? null} avatar={p?.avatar} size={36} />
      <span>{p?.handle ? <Link to={`/@${p.handle}`}>@{p.handle}</Link> : '@alguém'}{extra && <small className="faint">{extra}</small>}</span>
    </div>
  );
}

function TradeCard({ t, byId, section, children }: { t: Trade; byId: Record<string, Sticker>; section: Record<string, string>; children: ReactNode }) {
  const other = t.mine ? t.to : t.from;
  const get = (ids: string[]) => ids.map((id) => byId[id]).filter(Boolean) as Sticker[];
  const youGet = get(t.mine ? t.take : t.give), youGive = get(t.mine ? t.give : t.take);
  return (
    <li className="alb-trade">
      <Who p={other} extra={`${t.mine ? 'enviada' : 'recebida'} em ${day(t.createdAt)} · ${left(t.expiresAt)}`} />
      {t.message && <p className="alb-trade__msg">“{t.message}”</p>}
      <div className="alb-trade__sides">
        <Minis list={youGet} section={section} label="Você recebe" />
        <span className="alb-trade__arrow" aria-hidden="true">⇄</span>
        <Minis list={youGive} section={section} label="Você dá" />
      </div>
      <div className="alb-trade__acts">{children}</div>
    </li>
  );
}

function MatchCard({ m, byId, section, busy, blocked, onSend, onAdjust }: { m: TradeMatch; byId: Record<string, Sticker>; section: Record<string, string>; busy: boolean; blocked: boolean; onSend: (g: string[], t: string[]) => void; onAdjust: (g: string[], t: string[]) => void }) {
  const give = m.give.map((id) => byId[id]).filter(Boolean) as Sticker[];
  const take = m.take.map((id) => byId[id]).filter(Boolean) as Sticker[];
  const s = tradeSuggest(give, take);
  const g = s.give.map((x) => x.id), t = s.take.map((x) => x.id);
  return (
    <li className="alb-trade">
      <Who p={m.person} extra={m.friend ? 'Amigo' : m.follow ? 'Você segue' : `${take.length === 1 ? '1 que falta para você' : `${take.length} que faltam para você`}`} />
      <div className="alb-trade__sides">
        <Minis list={s.take} section={section} label="Você recebe" />
        <span className="alb-trade__arrow" aria-hidden="true">⇄</span>
        <Minis list={s.give} section={section} label="Você dá" />
      </div>
      <div className="alb-trade__acts">
        {m.pending ? <span className="alb-tag">Já há uma proposta entre vocês</span> : <>
          <button className="btn now sm" disabled={busy || blocked} onClick={() => onSend(g, t)}>Propor esta troca</button>
          <button className="btn quiet sm" disabled={busy || blocked} onClick={() => onAdjust(g, t)}>Ajustar</button>
        </>}
      </div>
    </li>
  );
}

function Composer({ c, byId, items, section, busy, onClose, onSend }: { c: { peer: TradePeer; give: string[]; take: string[] }; byId: Record<string, Sticker>; items: Record<string, { qty: number; pasted: boolean }>; section: Record<string, string>; busy: boolean; onClose: () => void; onSend: (g: string[], t: string[], m: string) => void }) {
  const { peer } = c;
  const [give, setGive] = useState<string[]>(c.give);
  const [take, setTake] = useState<string[]>(c.take);
  const [msg, setMsg] = useState('');
  const miss = new Set(peer.theyMiss);
  const mine = useMemo(() => Object.values(byId).filter((s) => s.active && tradeableTier(s.tier) && spares(items[s.id]) > 0)
    .sort((a, b) => Number(miss.has(b.id)) - Number(miss.has(a.id)) || a.number - b.number), [byId, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const theirs = peer.take.map((id) => byId[id]).filter(Boolean) as Sticker[];
  const flip = (l: string[], set: (v: string[]) => void, id: string) => set(l.includes(id) ? l.filter((x) => x !== id) : l.length >= TRADE_MAX ? l : [...l, id]);
  const g = give.map((id) => byId[id]).filter(Boolean), t = take.map((id) => byId[id]).filter(Boolean);
  const bal = g.length && t.length ? tradeBalance(g, t) : null;
  const h = peer.person.handle ?? '';
  return (
    <section className="alb-compose" id="troca-montar" aria-labelledby="troca-ttl">
      <div className="alb-compose__head">
        <Who p={peer.person} />
        <h2 className="t" id="troca-ttl">Montar troca</h2>
        <button className="btn quiet sm" onClick={onClose}>Fechar</button>
      </div>
      {peer.why ? <p className="muted">{WHY[peer.why]}</p> : peer.pending ? <p className="muted">Já existe uma proposta em aberto entre vocês. Espere a resposta ou cancele a sua em Enviadas.</p> : <>
        <div className="alb-compose__cols">
          <div>
            <h3 className="alb-compose__h">Você recebe <small>{take.length}/{TRADE_MAX}</small></h3>
            {theirs.length === 0 ? <p className="faint">@{h} não tem nenhuma repetida que falta para você.</p> :
              <ul className="alb-pick">{theirs.map((s) => <Pick key={s.id} s={s} section={section} on={take.includes(s.id)} onClick={() => flip(take, setTake, s.id)} />)}</ul>}
          </div>
          <div>
            <h3 className="alb-compose__h">Você dá <small>{give.length}/{TRADE_MAX}</small></h3>
            {mine.length === 0 ? <p className="faint">Você ainda não tem repetidas para trocar.</p> :
              <ul className="alb-pick">{mine.map((s) => <Pick key={s.id} s={s} section={section} on={give.includes(s.id)} hint={miss.has(s.id) ? `falta para @${h}` : undefined} onClick={() => flip(give, setGive, s.id)} />)}</ul>}
          </div>
        </div>
        <label className="faint alb-compose__msg">Recado (opcional)<input className="field" maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: tenho mais repetidas, se preferir outra" /></label>
        <div className="alb-vault__go">
          <span className="alb-compose__bal" role="status">{!bal ? 'Escolha pelo menos uma de cada lado.' : bal === 'igual' ? 'Troca equilibrada.' : bal === 'voce_da_mais' ? 'Você dá mais do que recebe.' : 'Você recebe mais do que dá. A outra pessoa decide.'}</span>
          <button className="btn now" disabled={!g.length || !t.length || busy} onClick={() => onSend(give, take, msg)}>{busy ? 'Enviando…' : `Enviar para @${h}`}</button>
        </div>
      </>}
    </section>
  );
}

function Pick({ s, section, on, hint, onClick }: { s: Sticker; section: Record<string, string>; on: boolean; hint?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className={`alb-pickit${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick} aria-label={`${s.name}, ${TIER_LABEL[s.tier]}${hint ? `, ${hint}` : ''}`}>
        <StickerView s={s} section={section[s.id]} />
        <small>{num3(s.number)} · {TIER_LABEL[s.tier]}</small>
        {hint && <span className="alb-pickit__hint">{hint}</span>}
        <span className="alb-pickit__check" aria-hidden="true">✓</span>
      </button>
    </li>
  );
}

/** A troca feita: as suas vão para a direita, as da outra pessoa vêm para a esquerda, e as novas ficam no meio. */
function SwapFx({ swap, section, book, onClose }: { swap: { give: Sticker[]; take: Sticker[]; who: string }; section: Record<string, string>; book?: Book; onClose: () => void }) {
  const [done, setDone] = useState(reduceMotion());
  useEffect(() => {
    sfx('card');
    const t1 = setTimeout(() => { sfx('coin'); setDone(true); }, reduceMotion() ? 0 : 1500);
    const t2 = setTimeout(() => { if (!reduceMotion()) burst(innerWidth / 2, innerHeight * 0.42, GOLD, 50, 6); }, 1600);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => { clearTimeout(t1); clearTimeout(t2); document.removeEventListener('keydown', esc); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`alb-swapfx${done ? ' is-done' : ''}`} role="dialog" aria-modal="true" aria-label="Troca feita">
      <div className="alb-swapfx__in">
        <div className="alb-swapfx__lane">
          <div className="alb-swapfx__out">{swap.give.map((s, i) => <div key={s.id} style={{ '--i': i } as CSSProperties}><StickerView s={s} section={section[s.id]} /></div>)}</div>
          <div className="alb-swapfx__inc">{swap.take.map((s, i) => <div key={s.id} style={{ '--i': i } as CSSProperties}><StickerView s={s} section={section[s.id]} /></div>)}</div>
        </div>
        <p className="alb-vaultfx__txt" role="status"><span className="alb-kick">Troca com @{swap.who}</span><b>Troca feita</b>{swap.take.length === 1 ? 'A nova foi para a bandeja do álbum.' : `As ${swap.take.length} novas foram para a bandeja do álbum.`}</p>
        <div className="alb-vaultfx__btns">
          {book && <Link className="btn now" to={`/album/${book.slug}`}>Colar no álbum</Link>}
          <button className="btn ghost" autoFocus onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
