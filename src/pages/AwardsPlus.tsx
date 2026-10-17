/**
 * E7.4 · WinnerZ Awards completo (migração 0070): a indicação aberta (até 3 jogos por categoria), a figurinha da
 * edição para quem votou, o histórico dos anos e, na montagem, as datas da indicação, a figurinha e a contagem das
 * indicações (para escolher os finalistas). Tudo opcional: sem datas nem figurinha, a edição é a versão simples.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { actions, getState, useStore } from '../data/store';
import { awardsApi, awardsPlus, nominationsOpen, phaseOf, type Award, type AwardFull, type AwardSticker, type Category, type Suggestion, type SuggestionCount, type Winner } from '../data/awards';
import { studioAlbumApi, type Sticker } from '../data/albumApi';
import { searchGames, loadGame, type Hit } from '../components/AddGameDialog';
import { CoverArt } from '../components/CoverArt';
import { StickerView } from '../components/album/StickerView';
import { ensureDefs, num3 } from '../components/album/render';
import { TIER_LABEL } from '../lib/album';
import { igdbSize } from '../lib/backdrop';
import { fmtWhen } from './Awards';

/* ---- Indicação aberta ---- */
export function AwardsNominate({ full }: { full: AwardFull }) {
  const s = useStore((x) => x);
  const logged = s.mode === 'demo' || !!s.profile;
  const catIds = useMemo(() => full.categories.map((c) => c.id), [full.categories]);
  const [mine, setMine] = useState<Suggestion[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (logged) awardsPlus.mySuggestions(full.award.id, catIds).then(setMine); else setMine([]); }, [full.award.id, catIds, logged]);
  const change = async (c: Category, h: Hit | null, gameId: string | null, on: boolean) => {
    setErr('');
    try {
      const g = h ? h.local ?? Object.values(s.games).find((x) => x.igdbId && x.igdbId === h.igdbId) ?? (await loadGame(h)) : gameId ? s.games[gameId] : null;
      if (!g) throw new Error('Não consegui carregar a ficha deste jogo.');
      actions.mergeGames([g]);
      setMine(await awardsPlus.suggest(full.award.id, catIds, c.id, g, on));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); }
  };
  return (
    <section className="awnom" aria-labelledby="awnom-t">
      <h2 className="t awnom__title" id="awnom-t">Indique os seus</h2>
      <p className="awnom__lead">Até 3 jogos por categoria. Os mais indicados viram finalistas, e a votação abre {full.award.votingOpens ? `em ${fmtWhen(full.award.votingOpens, true)}` : 'logo depois'}.</p>
      {!logged && <p className="awnom__lead"><Link className="btn primary" to="/entrar">Entre para indicar</Link></p>}
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="awnom__cats">
        {full.categories.map((c) => {
          const my = (mine ?? []).filter((x) => x.categoryId === c.id);
          return (
            <div key={c.id} className="awnom__cat">
              <h3 className="awnom__name">{c.name}</h3>
              {c.description && <p className="awnom__desc">{c.description}</p>}
              <ul className="awnom__mine">
                {my.map((x) => (
                  <li key={x.game.id}>
                    <span className="awnom__cover"><CoverArt game={x.game} /></span><span>{x.game.title}</span>
                    {logged && <button className="btn quiet sm" onClick={() => void change(c, null, x.game.id, false)} aria-label={`Tirar ${x.game.title}`}>Tirar</button>}
                  </li>
                ))}
                {Array.from({ length: Math.max(0, 3 - my.length) }, (_, i) => <li key={`v${i}`} className="awnom__slot" aria-hidden="true" />)}
              </ul>
              {logged && my.length < 3 && <NomineeSearch onPick={(h) => change(c, h, null, true)} taken={new Set(my.map((x) => x.game.slug))} label={`Indicar em ${c.name}`} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NomineeSearch({ onPick, taken, label }: { onPick: (h: Hit) => Promise<void>; taken: Set<string>; label: string }) {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => setHits((await searchGames(q.trim(), Object.values(games))).hits.slice(0, 6)), 300);
    return () => clearTimeout(t);
  }, [q, games]);
  return (
    <div className="awnom__search">
      <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jogo" aria-label={label} />
      {hits.length > 0 && (
        <ul className="awnom__hits">
          {hits.map((h) => (
            <li key={h.slug}>
              <button disabled={taken.has(h.slug) || !!busy} onClick={async () => { setBusy(h.slug); await onPick(h); setBusy(''); setQ(''); setHits([]); }}>
                <span className="awnom__cover"><CoverArt game={h} /></span>
                <span>{h.title}{h.year ? ` (${h.year})` : ''}</span>
                <span className="faint">{taken.has(h.slug) ? 'Indicado' : busy === h.slug ? 'Indicando…' : 'Indicar'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- Figurinha da edição ---- */
export function AwardsStickerCard({ award }: { award: Award }) {
  const [st, setSt] = useState<AwardSticker>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { ensureDefs(); if (award.stickerId) awardsPlus.sticker(award.id).then(setSt); }, [award.id, award.stickerId]);
  if (!st?.sticker) return null;
  const claim = async () => { setBusy(true); setErr(''); try { setSt(await awardsPlus.claimSticker(award.id)); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); } finally { setBusy(false); } };
  return (
    <section className="awstk" aria-label="Figurinha da edição">
      <div className="awstk__card"><StickerView s={st.sticker} /></div>
      <div className="awstk__text">
        <span className="kicker">Figurinha da edição · {TIER_LABEL[st.sticker.tier]} · {num3(st.sticker.number)}</span>
        <b className="t awstk__name">{st.sticker.name}</b>
        <p>{st.claimed ? 'Ela já está no seu álbum.' : st.open ? (st.voted ? 'Você votou nesta edição: a figurinha é sua.' : 'Ela foi para quem votou nesta edição.') : 'Quem votar ganha esta figurinha quando o resultado sair.'}</p>
        {st.open && st.voted && !st.claimed && <button className="btn now" disabled={busy} onClick={() => void claim()}>{busy ? 'Pegando…' : 'Pegar a figurinha'}</button>}
        {st.claimed && <Link className="btn ghost sm" to="/album/figurinhas">Ver no álbum</Link>}
        {err && <p className="awards__error" role="alert">{err}</p>}
      </div>
    </section>
  );
}

/* ---- Histórico dos anos ---- */
export function AwardsHistoryPage() {
  const [list, setList] = useState<{ award: Award; winners: Winner[] }[] | null>(null);
  useEffect(() => {
    (async () => {
      const all = (await awardsApi().list()).filter((a) => phaseOf(a) === 'resultado').sort((a, b) => b.year - a.year);
      setList(await Promise.all(all.map(async (award) => ({ award, winners: await awardsPlus.winners(award.id) }))));
    })().catch(() => setList([]));
  }, []);
  return (
    <main className="page pad awhist">
      <Link to="/eventos/awards" className="back">← WinnerZ Awards</Link>
      <h1 className="t big">Edições anteriores</h1>
      {list === null ? <p className="muted">Carregando…</p> : !list.length ? <p className="muted lead">A primeira edição ainda não terminou. Os vencedores de cada ano ficam guardados aqui.</p> : list.map(({ award, winners }) => {
        const [top, ...rest] = winners;
        return (
          <section key={award.id} className="awhist__year" aria-labelledby={`awh-${award.id}`}>
            <h2 className="t awhist__title" id={`awh-${award.id}`}>{award.title}</h2>
            {top && (
              <div className="awhist__top">
                {top.game.backdrop && <img className="awhist__bg" src={igdbSize(top.game.backdrop, 't_1080p')} alt="" />}
                <span className="awhist__shade" aria-hidden="true" />
                <div className="awhist__toptext"><span className="kicker">{top.category}</span><b className="t">{top.game.title}</b></div>
              </div>
            )}
            {rest.length > 0 && (
              <ul className="awhist__list">
                {rest.map((w) => (
                  <li key={w.categoryId}><span className="awhist__cover"><CoverArt game={w.game} /></span><span><span className="awhist__cat">{w.category}</span><b>{w.game.title}</b></span></li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </main>
  );
}

/* ---- Montagem: indicação aberta, figurinha e a contagem das indicações ---- */
const toLocal = (iso?: string) => (iso ? new Date(Date.parse(iso) - 3 * 3600000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(`${v}:00-03:00`).toISOString() : undefined);
export function AwardsAdminPlus({ full, run, onSaved }: { full: AwardFull; run: (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>; onSaved: () => void }) {
  const a = full.award;
  const [opens, setOpens] = useState(a.nominationsOpens);
  const [closes, setCloses] = useState(a.nominationsCloses);
  const [sticker, setSticker] = useState(a.stickerId ?? '');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [counts, setCounts] = useState<SuggestionCount[] | null>(null);
  const catIds = useMemo(() => full.categories.map((c) => c.id), [full.categories]);
  useEffect(() => { studioAlbumApi.catalog().then((c) => setStickers(c.stickers.filter((x) => x.active))).catch(() => setStickers([])); }, []);
  useEffect(() => { if (a.nominationsOpens) awardsPlus.counts(a.id, catIds).then(setCounts).catch(() => setCounts([])); }, [a.id, a.nominationsOpens, catIds]);
  const save = () => {
    if (opens && closes && Date.parse(closes) <= Date.parse(opens)) return void run(async () => { throw new Error('A indicação precisa fechar depois de abrir.'); });
    if (closes && a.votingOpens && Date.parse(closes) > Date.parse(a.votingOpens)) return void run(async () => { throw new Error('A indicação precisa fechar antes de a votação abrir.'); });
    void run(async () => { await awardsApi().saveAward({ ...a, nominationsOpens: opens, nominationsCloses: closes, stickerId: sticker || undefined }); onSaved(); }, 'Gravado.');
  };
  const add = (c: Category, x: SuggestionCount) => run(async () => {
    const g = getState().games[x.game.id];
    await awardsApi().addNominee(c.id, (g ?? { ...x.game, cover: x.game.cover ?? '' }) as Parameters<ReturnType<typeof awardsApi>['addNominee']>[1], c.nominees.length);
  }, `${x.game.title} virou finalista.`);
  return (
    <section className="card awards-admin__form awplus" aria-labelledby="awplus-h">
      <h2 id="awplus-h" className="t">Indicação aberta e figurinha</h2>
      <div className="awards-admin__grid">
        <label><span>Indicação abre (Brasília)</span><input className="field" type="datetime-local" value={toLocal(opens)} onChange={(e) => setOpens(fromLocal(e.target.value))} /></label>
        <label><span>Indicação fecha</span><input className="field" type="datetime-local" value={toLocal(closes)} onChange={(e) => setCloses(fromLocal(e.target.value))} /></label>
        <label className="awards-admin__wide"><span>Figurinha da edição (quem votar pega quando o resultado sair)</span>
          <select className="field" value={sticker} onChange={(e) => setSticker(e.target.value)}>
            <option value="">Sem figurinha</option>
            {stickers.map((x) => <option key={x.id} value={x.id}>{num3(x.number)} · {x.name} ({TIER_LABEL[x.tier]})</option>)}
          </select>
        </label>
        <p className="faint awards-admin__wide">Em branco, a edição segue a versão simples. Na indicação aberta, quem tem conta sugere até 3 jogos por categoria; a contagem aparece abaixo, e você escolhe os finalistas (os indicados da votação).{nominationsOpen(a) ? ' A indicação está aberta agora.' : ''}</p>
      </div>
      <button className="btn primary" onClick={save}>Gravar</button>
      {counts && counts.length > 0 && (
        <div className="awplus__counts">
          <h3 className="t">Mais indicados pela comunidade</h3>
          {full.categories.map((c) => {
            const list = counts.filter((x) => x.categoryId === c.id).slice(0, 8);
            if (!list.length) return null;
            const already = new Set(c.nominees.map((n) => n.gameId));
            return (
              <div key={c.id} className="awplus__cat">
                <b>{c.name}</b>
                <ul>{list.map((x) => (
                  <li key={x.game.id}><span className="awnom__cover"><CoverArt game={x.game} /></span><span>{x.game.title}</span><span className="faint">{x.n} {x.n === 1 ? 'indicação' : 'indicações'}</span>
                    <button className="btn ghost sm" disabled={already.has(x.game.id)} onClick={() => void add(c, x)}>{already.has(x.game.id) ? 'Finalista' : 'Tornar finalista'}</button></li>
                ))}</ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
