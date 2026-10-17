/**
 * Temporadas pessoais (J6): a lista em "Meu ritmo", a folha para criar uma temporada e a retrospectiva
 * (/jornada/temporada/:id), com um cartão para compartilhar. Só com o que foi registrado.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { actions, useStore } from '../data/store';
import { autoSeasons, seasonById, seasonRange, seasonStats, type Season } from '../lib/seasons';
import { Link } from '../lib/router';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { CoverArt } from './CoverArt';
import { SubNav } from './SubNav';
import { durLabel, dayMonth } from '../lib/format';
import { track } from '../lib/track';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function SeasonsSection() {
  const s = useStore((x) => x);
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const custom: Season[] = (s.prefs.seasons ?? []).map((c) => ({ ...c, auto: false }));
    return [...custom.sort((a, b) => b.from.localeCompare(a.from)), ...autoSeasons(new Date(), 4)];
  }, [s.prefs.seasons]);
  const withStats = list.map((x) => ({ season: x, st: seasonStats(s, x) })).filter((x, i) => !x.season.auto || i === (s.prefs.seasons?.length ?? 0) || x.st.sessions > 0);
  return (
    <section className="seasons" aria-labelledby="temporadas-h">
      <div className="seasons__head">
        <h2 id="temporadas-h" className="t">Temporadas</h2>
        <button className="btn quiet sm" onClick={() => setOpen(true)}><Icon name="mais" size={14} />Criar uma temporada</button>
      </div>
      <p className="muted">As estações do ano viram temporadas sozinhas. Crie as suas para as férias, um mês temático ou o que quiser.</p>
      <div className="seasons__grid">
        {withStats.map(({ season, st }) => (
          <Link key={season.id} to={`/jornada/temporada/${season.id}`} className="season-card">
            <div className="season-card__covers" aria-hidden="true">{st.games.slice(0, 3).map((g) => <CoverArt key={g.game.id} game={g.game} />)}</div>
            <span className="kicker">{season.auto ? 'Estação' : 'Sua temporada'} · {seasonRange(season)}</span>
            <b>{season.name}</b>
            <span className="muted">{st.sessions ? [plural(st.sessions, 'sessão', 'sessões'), plural(st.games.length, 'jogo', 'jogos'), st.done.length ? plural(st.done.length, 'zerado', 'zerados') : ''].filter(Boolean).join(' · ') : 'Ainda sem sessões nesta temporada.'}</span>
          </Link>
        ))}
      </div>
      {open && <SeasonSheet onClose={() => setOpen(false)} />}
    </section>
  );
}

function SeasonSheet({ onClose, edit }: { onClose: () => void; edit?: Season }) {
  const stored = useStore((s) => s.prefs.seasons);
  const seasons = stored ?? [];
  const [name, setName] = useState(edit?.name ?? '');
  const [from, setFrom] = useState(edit?.from ?? '');
  const [to, setTo] = useState(edit?.to ?? '');
  const ok = name.trim().length >= 2 && from && to && from <= to;
  const save = () => {
    const item = { id: edit?.id ?? `c-${Date.now().toString(36)}`, name: name.trim().slice(0, 40), from, to };
    actions.setPrefs({ seasons: [...seasons.filter((x) => x.id !== item.id), item].slice(-30) });
    track('jornada.temporada');
    onClose();
  };
  return (
    <Sheet title={edit ? 'Editar a temporada' : 'Criar uma temporada'} onClose={onClose}>
      <label htmlFor="ss-name" className="finish__label">Nome</label>
      <input id="ss-name" className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Férias retrô" />
      <div className="season-dates">
        <label><span className="finish__label">De</span><input className="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label><span className="finish__label">Até</span><input className="field" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <p className="faint">Pode ser no passado: a retrospectiva sai do que você já registrou.</p>
      <div className="sheet__actions">
        {edit && <button className="btn quiet danger" onClick={() => { actions.setPrefs({ seasons: seasons.filter((x) => x.id !== edit.id) }); onClose(); }}>Apagar</button>}
        <button className="btn quiet" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!ok} onClick={save}>Salvar</button>
      </div>
    </Sheet>
  );
}

export function SeasonPage({ id }: { id: string }) {
  const s = useStore((x) => x);
  const season = seasonById(id, s.prefs.seasons ?? []);
  const st = useMemo(() => (season ? seasonStats(s, season) : null), [s, season?.id, season?.from, season?.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const [edit, setEdit] = useState(false);
  const [card, setCard] = useState(false);
  useEffect(() => { track('jornada.retrospectiva'); }, []);
  if (!season || !st) return <main className="page pad"><h1 className="t big">Temporada não encontrada</h1><Link to="/jornada/ritmo">Voltar para Meu ritmo</Link></main>;
  const light = !!s.prefs.light;
  return (
    <main className="page pad season">
      <header className="page-head">
        <div className="page-head__text">
          <Link to="/jornada/ritmo" className="back">← Meu ritmo</Link>
          <h1 className="t big">{season.name}</h1>
          <p className="muted lead">{seasonRange(season)}{season.auto ? ' · estação do ano' : ''}</p>
        </div>
        <SubNav pillar="jornada" />
      </header>
      {!st.sessions && !st.done.length ? (
        <div className="card tl-empty"><p className="muted">Nenhuma sessão registrada nesta temporada. Temporada vazia também é temporada.</p></div>
      ) : (
        <>
          <dl className="season__stats">
            <div><dd className="t">{st.sessions}</dd><dt>{st.sessions === 1 ? 'sessão' : 'sessões'}</dt></div>
            <div><dd className="t">{st.games.length}</dd><dt>{st.games.length === 1 ? 'jogo' : 'jogos'}</dt></div>
            {st.done.length > 0 && <div><dd className="t season__gold">{st.done.length}</dd><dt>{st.done.length === 1 ? 'zerado' : 'zerados'}</dt></div>}
            {!light && st.minutes > 0 && <div><dd className="t">{durLabel(st.minutes)}</dd><dt>informadas</dt></div>}
            <div><dd className="t">{st.days}</dd><dt>{st.days === 1 ? 'dia de jogo' : 'dias de jogo'}</dt></div>
          </dl>
          {st.top && (
            <section className="card season__top" aria-labelledby="sz-top">
              <span className="season__top-cover"><CoverArt game={st.top.game} /></span>
              <div>
                <h2 id="sz-top" className="kicker">O jogo da temporada</h2>
                <Link to={`/jornada/${st.top.game.slug}`} className="t season__top-title">{st.top.game.title}</Link>
                <p className="muted">{plural(st.top.sessions, 'sessão', 'sessões')}{!light && st.top.minutes ? `, ${durLabel(st.top.minutes)} informadas` : ''}.</p>
              </div>
            </section>
          )}
          <div className="season__grid">
            {st.games.length > 0 && (
              <section className="card season__box" aria-labelledby="sz-games">
                <h2 id="sz-games" className="kicker">Jogos</h2>
                <ul className="season__games">{st.games.map((g) => <li key={g.game.id}><Link to={`/jornada/${g.game.slug}`}><CoverArt game={g.game} /></Link><span><b>{g.game.title}</b><span className="muted">{plural(g.sessions, 'sessão', 'sessões')}{!light && g.minutes ? ` · ${durLabel(g.minutes)}` : ''}</span></span></li>)}</ul>
              </section>
            )}
            <section className="card season__box" aria-labelledby="sz-marks">
              <h2 id="sz-marks" className="kicker">Marcos</h2>
              <ul className="season__marks">
                {st.first && <li>Primeira sessão: <b>{st.first.game.title}</b>, {dayMonth(st.first.at)}.</li>}
                {st.started.map((g) => <li key={`c-${g.id}`}>Começou <b>{g.title}</b>.</li>)}
                {st.done.map((d) => <li key={`z-${d.game.id}`} className="season__gold">Zerou <b>{d.game.title}</b>, {dayMonth(d.at)}.</li>)}
                {st.last && <li>Última sessão: <b>{st.last.game.title}</b>, {dayMonth(st.last.at)}.</li>}
                {st.companions.length > 0 && <li>Jogou com {st.companions.map((c) => c.name).join(', ')}.</li>}
              </ul>
            </section>
          </div>
          {st.moments.length > 0 && (
            <section className="season__moments" aria-labelledby="sz-mom">
              <h2 id="sz-mom" className="kicker">Momentos</h2>
              <div className="season__photos">{st.moments.map((e) => <figure key={e.id}><img src={e.image} alt="" loading="lazy" /><figcaption>{e.title}</figcaption></figure>)}</div>
            </section>
          )}
          <p className="faint">Calculado só com o que você registrou{!light && st.informed < st.sessions ? `; as horas contam só ${st.informed === 1 ? 'a sessão' : `as ${st.informed} sessões`} com tempo informado` : ''}. Não é meta nem placar.</p>
        </>
      )}
      <div className="season__actions">
        {(st.sessions > 0 || st.done.length > 0) && <button className="btn primary" onClick={() => setCard(true)}>Cartão para compartilhar</button>}
        {!season.auto && <button className="btn quiet" onClick={() => setEdit(true)}>Editar a temporada</button>}
      </div>
      {edit && <SeasonSheet edit={season} onClose={() => setEdit(false)} />}
      {card && <SeasonCard season={season} onClose={() => setCard(false)} />}
    </main>
  );
}

/* ---- Cartão da temporada ----------------------------------------------------------------- */
const CW = 1080, CH = 1350;
function img(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((ok) => { const i = new Image(); if (/^https?:/.test(src) && !src.startsWith(location.origin)) i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
}
function fit(ctx: CanvasRenderingContext2D, i: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / i.width, h / i.height), sw = w / k, sh = h / k;
  ctx.drawImage(i, (i.width - sw) / 2, (i.height - sh) / 2, sw, sh, x, y, w, h);
}

function SeasonCard({ season, onClose }: { season: Season; onClose: () => void }) {
  const s = useStore((x) => x);
  const st = useMemo(() => seasonStats(s, season), [s, season]);
  const [url, setUrl] = useState('');
  const blob = useRef<Blob | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const c = document.createElement('canvas'); c.width = CW; c.height = CH;
      const ctx = c.getContext('2d')!;
      await Promise.all([document.fonts?.load('800 64px "Archivo"'), document.fonts?.load('500 26px "IBM Plex Mono"')].map((p) => p?.catch(() => null)));
      ctx.fillStyle = '#07080A'; ctx.fillRect(0, 0, CW, CH);
      const glow = ctx.createRadialGradient(CW * 0.7, 120, 40, CW * 0.7, 120, 900); glow.addColorStop(0, 'rgba(255,178,91,0.35)'); glow.addColorStop(1, 'rgba(7,8,10,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, CW, CH);
      const covers = await Promise.all(st.games.slice(0, 6).map((g) => img(g.game.cover)));
      const cw = 300, ch = 400, gap = 30, cols = Math.min(3, Math.max(1, covers.length)), x0 = (CW - (cols * cw + (cols - 1) * gap)) / 2;
      covers.slice(0, 3).forEach((im, i) => { const x = x0 + i * (cw + gap), y = 110; ctx.fillStyle = '#14171B'; ctx.fillRect(x, y, cw, ch); if (im) fit(ctx, im, x, y, cw, ch); ctx.strokeStyle = i === 0 ? '#E2BE84' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = i === 0 ? 6 : 2; ctx.strokeRect(x, y, cw, ch); });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFB25B'; ctx.font = '500 26px "IBM Plex Mono", monospace'; ctx.fillText(`MINHA TEMPORADA · ${seasonRange(season).toUpperCase()}`, CW / 2, 600);
      ctx.fillStyle = '#F2F4F6'; ctx.font = '800 76px "Archivo", sans-serif'; ctx.fillText(season.name.toUpperCase().slice(0, 24), CW / 2, 690);
      const nums: [string, string][] = [[String(st.sessions), st.sessions === 1 ? 'sessão' : 'sessões'], [String(st.games.length), st.games.length === 1 ? 'jogo' : 'jogos'], [String(st.done.length), st.done.length === 1 ? 'zerado' : 'zerados']];
      if (!s.prefs.light && st.minutes) nums.push([durLabel(st.minutes), 'informadas']);
      const w = CW / nums.length;
      nums.forEach(([n, l], i) => { ctx.fillStyle = i === 2 && st.done.length ? '#E2BE84' : '#F2F4F6'; ctx.font = '800 72px "Archivo", sans-serif'; ctx.fillText(n, w * i + w / 2, 840); ctx.fillStyle = '#9AA1AA'; ctx.font = '500 24px "IBM Plex Mono", monospace'; ctx.fillText(l.toUpperCase(), w * i + w / 2, 885); });
      ctx.fillStyle = '#C9CED4'; ctx.font = '400 34px "Archivo", sans-serif';
      if (st.top) ctx.fillText(`Jogo da temporada: ${st.top.game.title}`.slice(0, 54), CW / 2, 1000);
      if (st.done.length) ctx.fillText(`Zerou ${st.done.map((d) => d.game.title).join(', ')}`.slice(0, 54), CW / 2, 1055);
      ctx.fillStyle = '#9AA1AA'; ctx.font = '500 22px "IBM Plex Mono", monospace'; ctx.fillText('winnerz.com.br', CW / 2, CH - 50);
      const b = await new Promise<Blob | null>((ok) => { try { c.toBlob(ok, 'image/png'); } catch { ok(null); } });
      if (!alive) return;
      blob.current = b;
      setUrl(b ? URL.createObjectURL(b) : '');
    })();
    return () => { alive = false; };
  }, [st, season, s.prefs.light]);
  const name = `winnerz-${season.id}.png`;
  const share = async () => {
    if (!blob.current) return;
    const file = new File([blob.current], name, { type: 'image/png' });
    track('jornada.cartao-temporada');
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: season.name }); } catch { /* cancelado */ } }
    else { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); }
  };
  return (
    <Sheet title="Cartão da temporada" onClose={onClose} wide>
      <div className="share-card">
        <div className="share-card__preview">{url ? <img src={url} alt={`Cartão de ${season.name}`} /> : <div className="share-card__wait">Montando o cartão…</div>}</div>
        <div className="share-card__opts">
          <p className="faint">Só o que aparece na imagem sai do site: as capas, os números e o jogo da temporada.</p>
          <div className="sheet__actions"><button className="btn primary lg" disabled={!url} onClick={share}>{typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? 'Compartilhar' : 'Baixar imagem'}</button></div>
        </div>
      </div>
    </Sheet>
  );
}
