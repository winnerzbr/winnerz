/**
 * O Cofre: repetidas viram uma figurinha que falta. 3 repetidas por uma Comum à escolha, 10 por uma Incomum à
 * escolha (Raras e Lendárias só saem em pacotes). A pessoa escolhe a figurinha e quais repetidas entram (a sugestão
 * já vem pronta e nunca toca na última cópia). O banco confere tudo de novo; a nova vai para a bandeja.
 */
import { useMemo, useRef, useState } from 'react';
import { Link } from '../../lib/router';
import { albumApi, type AlbumBook as Book, type AlbumState, type Sticker } from '../../data/albumApi';
import { spares, TIER_LABEL, VAULT_COST, vaultCheck, vaultSuggest, type Tier, type VaultGive } from '../../lib/album';
import { logoGold, num3 } from './render';
import { burst, GOLD, reduceMotion, sfx } from './fx';
import { StickerView } from './StickerView';

const OFFERS: Tier[] = ['comum', 'incomum'];

export function Vault({ state, section, bookOf }: { state: AlbumState; section: Record<string, string>; bookOf: Record<string, Book> }) {
  const items = useMemo(() => Object.fromEntries(state.items.map((i) => [i.id, i])), [state.items]);
  const pool = useMemo(() => state.stickers.filter((s) => s.active && state.books.some((b) => b.published && b.pages.some((p) => p.id === s.pageId)))
    .sort((a, b) => a.number - b.number), [state]);
  const spareList = pool.filter((s) => spares(items[s.id]) > 0);
  const totalSpares = spareList.reduce((t, s) => t + spares(items[s.id]), 0);
  const missing = (t: Tier) => pool.filter((s) => s.tier === t && !((items[s.id]?.qty ?? 0) > 0));

  const [tier, setTier] = useState<Tier | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [give, setGive] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fx, setFx] = useState<null | 'spin' | 'open'>(null);
  const [won, setWon] = useState<Sticker | null>(null);
  const door = useRef<HTMLDivElement>(null);
  const pickRef = useRef<HTMLElement>(null);
  const giveRef = useRef<HTMLElement>(null);

  const need = tier ? VAULT_COST[tier]! : 0;
  const chosen = target ? pool.find((s) => s.id === target) ?? null : null;
  const giveList: VaultGive = Object.entries(give).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n }));
  const picked = giveList.reduce((t, g) => t + g.n, 0);
  const check = chosen ? vaultCheck(chosen, giveList, items) : 'vault_give';

  const suggest = (n: number) => Object.fromEntries(vaultSuggest(n, spareList, items).map((g) => [g.id, g.n]));
  const chooseTier = (t: Tier) => { setTier(t); setTarget(null); setGive({}); setErr(''); setWon(null); setTimeout(() => pickRef.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }), 60); };
  const chooseTarget = (id: string) => { setTarget(id); setGive(suggest(need)); setErr(''); setTimeout(() => giveRef.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }), 60); };
  const step = (id: string, d: number) => setGive((g) => {
    const max = spares(items[id]); const cur = g[id] ?? 0; const left = need - picked;
    const n = Math.max(0, Math.min(max, cur + (d > 0 ? Math.min(d, left) : d)));
    return { ...g, [id]: n };
  });

  async function trade() {
    if (!chosen || check) return;
    setBusy(true); setErr('');
    const motion = !reduceMotion();
    // as repetidas escolhidas voam até a porta do Cofre
    setFx('spin'); sfx('drum');
    if (motion) {
      await new Promise((r) => setTimeout(r, 40));
      const d = door.current?.getBoundingClientRect();
      if (d) {
        const srcs = giveList.flatMap((g) => Array.from({ length: Math.min(g.n, 3) }, () => document.querySelector<HTMLElement>(`[data-spare="${g.id}"] .wsw`))).filter(Boolean).slice(0, 10) as HTMLElement[];
        srcs.forEach((el, i) => {
          const r = el.getBoundingClientRect(); const c = el.cloneNode(true) as HTMLElement;
          c.classList.add('alb-vaultfly'); Object.assign(c.style, { width: `${r.width}px`, left: '0px', top: '0px' }); document.body.append(c);
          const tx = d.left + d.width / 2 - r.width / 2, ty = d.top + d.height / 2 - r.height / 2;
          c.animate([{ transform: `translate(${r.left}px,${r.top}px) rotate(0) scale(1)`, opacity: 1 },
            { transform: `translate(${(r.left + tx) / 2}px,${Math.min(r.top, ty) - 60}px) rotate(${i % 2 ? 12 : -12}deg) scale(.8)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${tx}px,${ty}px) rotate(${i % 2 ? 40 : -40}deg) scale(.15)`, opacity: 0 }],
          { duration: 760, delay: i * 70, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).onfinish = () => { c.remove(); sfx('tick'); };
        });
      }
    }
    try {
      const [s] = await Promise.all([albumApi.vault(chosen.id, giveList), new Promise((r) => setTimeout(r, motion ? 1700 : 0))]);
      setWon(s); setFx('open'); sfx(s.tier === 'incomum' ? 'inc' : 'coin');
      if (motion) setTimeout(() => { const r = door.current?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.top + r.height / 2, GOLD, s.tier === 'incomum' ? 70 : 44, 6); }, 260);
      setTier(null); setTarget(null); setGive({});
    } catch (e) {
      setFx(null); setErr(e instanceof Error ? e.message : 'O Cofre não abriu agora. Tente de novo.');
    } finally { setBusy(false); }
  }

  const book = won ? bookOf[won.id] : undefined;
  return (
    <div className="alb-vault">
      <section className="alb-vault__intro">
        <div className="alb-vault__door alb-vault__door--sm" aria-hidden="true"><VaultDoor /></div>
        <div>
          <p className="alb-vault__lead">Troque repetidas por uma figurinha que falta, à sua escolha.</p>
          <p className="muted">Você sempre fica com pelo menos uma de cada. Raras e Lendárias só saem em pacotes.</p>
          <p className="alb-vault__have"><b>{totalSpares}</b> {totalSpares === 1 ? 'repetida disponível' : 'repetidas disponíveis'}</p>
        </div>
      </section>

      <ul className="alb-vault__offers">
        {OFFERS.map((t) => {
          const cost = VAULT_COST[t]!; const miss = missing(t).length; const can = totalSpares >= cost && miss > 0;
          return (
            <li key={t} className={`alb-offer alb-offer--${t}${tier === t ? ' is-on' : ''}`}>
              <span className="alb-kick">{cost} repetidas</span>
              <b className="alb-offer__ttl">1 {TIER_LABEL[t]} à escolha</b>
              <span className="alb-bar"><i style={{ width: `${Math.min(100, Math.round((totalSpares / cost) * 100))}%` }} /></span>
              <span className="faint alb-offer__why">{miss === 0 ? `Você já tem todas as ${TIER_LABEL[t]}s.` : totalSpares >= cost ? `${miss === 1 ? 'Falta 1' : `Faltam ${miss}`} para escolher.` : `Faltam ${cost - totalSpares} repetidas.`}</span>
              <button className={`btn ${can ? 'now' : 'ghost'} sm`} disabled={!can || busy} onClick={() => chooseTier(t)}>Escolher a {TIER_LABEL[t]}</button>
            </li>
          );
        })}
      </ul>

      {err && <p className="awards__error" role="alert">{err}</p>}

      {tier && (
        <section className="alb-vault__step" ref={pickRef} aria-labelledby="vault-pick">
          <h2 className="t" id="vault-pick"><span className="alb-vault__n">1</span>Qual {TIER_LABEL[tier]} você quer?</h2>
          <ul className="alb-vault__targets">
            {missing(tier).map((s) => (
              <li key={s.id}>
                <button type="button" className={`alb-target${target === s.id ? ' is-on' : ''}`} aria-pressed={target === s.id} onClick={() => chooseTarget(s.id)}>
                  <span className="alb-miss"><span>{num3(s.number)}</span></span>
                  <b>{s.name}</b><small>{section[s.id] ?? ''}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tier && chosen && (
        <section className="alb-vault__step" ref={giveRef} aria-labelledby="vault-give">
          <h2 className="t" id="vault-give"><span className="alb-vault__n">2</span>Quais repetidas entram</h2>
          <p className="muted">Já separamos as mais comuns. Ajuste se quiser guardar alguma.</p>
          <ul className="alb-spares">
            {spareList.map((s) => {
              const n = give[s.id] ?? 0, max = spares(items[s.id]);
              return (
                <li key={s.id} className={`alb-spare${n ? ' is-on' : ''}`} data-spare={s.id}>
                  <StickerView s={s} section={section[s.id]} />
                  <div className="alb-spare__txt"><b>{s.name}</b><small>{num3(s.number)} · {TIER_LABEL[s.tier]} · {max === 1 ? '1 repetida' : `${max} repetidas`}</small></div>
                  <div className="alb-step" role="group" aria-label={`Quantas de ${s.name}`}>
                    <button type="button" aria-label="Menos uma" disabled={n === 0 || busy} onClick={() => step(s.id, -1)}>−</button>
                    <output aria-live="polite">{n}</output>
                    <button type="button" aria-label="Mais uma" disabled={n >= max || picked >= need || busy} onClick={() => step(s.id, 1)}>+</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="alb-vault__go">
            <span className={`alb-vault__count${picked === need ? ' is-ok' : ''}`} role="status">{picked} de {need}</span>
            <button className="btn quiet sm" disabled={busy} onClick={() => setGive(suggest(need))}>Sugerir de novo</button>
            <button className="btn quiet sm" disabled={busy || !picked} onClick={() => setGive({})}>Limpar</button>
            <button className="btn now" disabled={!!check || busy} onClick={() => void trade()}>{busy ? 'Abrindo o Cofre…' : `Trocar por ${chosen.name}`}</button>
          </div>
        </section>
      )}

      {fx && (
        <div className={`alb-vaultfx is-${fx}`} role="dialog" aria-modal="true" aria-label="Cofre">
          <div className="alb-vaultfx__in">
            <div className="alb-vault__door" ref={door} aria-hidden="true"><VaultDoor /></div>
            {fx === 'spin' && <p className="alb-vaultfx__txt" role="status">Abrindo o Cofre…</p>}
            {fx === 'open' && won && (
              <>
                <div className="alb-vaultfx__card"><StickerView s={won} section={section[won.id]} /></div>
                <p className="alb-vaultfx__txt" role="status"><span className="alb-kick">{TIER_LABEL[won.tier]} · {num3(won.number)}</span><b>{won.name}</b>Ela foi para a bandeja do álbum.</p>
                <div className="alb-vaultfx__btns">
                  {book && <Link className="btn now" to={`/album/${book.slug}`}>Colar no álbum</Link>}
                  <button className="btn ghost" autoFocus onClick={() => { setFx(null); setWon(null); }}>Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** A porta do Cofre: anel com rebites, volante de três raios e o selo no centro. */
function VaultDoor() {
  const bolts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <circle key={i} cx={50 + Math.cos(a) * 43} cy={50 + Math.sin(a) * 43} r="1.6" fill="url(#alb-skgold)" />; });
  return (
    <>
      <svg viewBox="0 0 100 100" className="alb-door__ring">
        <circle cx="50" cy="50" r="48" fill="#111216" stroke="url(#alb-skgold)" strokeWidth="2" />
        <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(226,190,132,.35)" strokeWidth=".6" />
        {bolts}
      </svg>
      <svg viewBox="0 0 100 100" className="alb-door__wheel">
        <circle cx="50" cy="50" r="30" fill="none" stroke="url(#alb-skgold)" strokeWidth="2.2" />
        {[0, 120, 240].map((d) => <g key={d} transform={`rotate(${d} 50 50)`}><rect x="48.6" y="14" width="2.8" height="22" rx="1.4" fill="url(#alb-skgold)" /><circle cx="50" cy="13" r="3.2" fill="url(#alb-skgold)" /></g>)}
        <circle cx="50" cy="50" r="15" fill="#0b0c0f" stroke="url(#alb-skgold)" strokeWidth="1.2" />
      </svg>
      <span className="alb-door__mark" dangerouslySetInnerHTML={{ __html: logoGold() }} />
    </>
  );
}
