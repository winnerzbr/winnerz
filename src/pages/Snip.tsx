/** /t/<código>: um trecho da Jornada que alguém compartilhou. Mostra só aquele trecho. */
import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { snipApi, type SnipView } from '../data/snipApi';
import { SNIP_KICKER } from '../components/SnipShare';
import { CoverArt } from '../components/CoverArt';
import { ReportButton } from '../components/Moderation';
import { whenLabel } from '../lib/dates';

export function SnipPage({ token }: { token: string }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [v, setV] = useState<SnipView | null | undefined>(undefined);
  const [err, setErr] = useState('');
  useEffect(() => { snipApi.get(token).then(setV).catch((e) => { setErr(e instanceof Error ? e.message : 'Não consegui carregar o trecho.'); setV(null); }); }, [token]);
  useEffect(() => { document.title = v ? `${v.title} · ${v.game.title} · WinnerZ` : 'Trecho · WinnerZ'; }, [v]);
  if (v === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!v) return (
    <main className="page pad narrow"><h1 className="t big">Trecho</h1>
      <p className="muted lead">{err || 'Este link foi desligado por quem compartilhou, ou não está aberto para você.'}</p>
      <Link to="/" className="btn ghost">Ir para o WinnerZ</Link>
    </main>
  );
  const at = `/@${v.owner.handle.toLowerCase()}`;
  const bg = v.image || v.game.backdrop || v.game.cover;
  const date = v.dateLabel || whenLabel(v.at, v.precision ?? 'dia');
  return (
    <main className="snip">
      <div className="snip__bg on-photo" aria-hidden="true">{bg && <img src={bg} alt="" />}<span className="snip__shade" /></div>
      <article className="snip__card">
        {v.image && <figure className="snip__photo"><img src={v.image} alt={v.title} /></figure>}
        <div className="snip__body">
          <Link to={`/jogos/${v.game.slug}`} className="snip__game">
            <span className="snip__cover"><CoverArt game={{ title: v.game.title, cover: v.game.cover ?? '' }} /></span>
            <span><small className="kicker">{SNIP_KICKER[v.kind] ?? 'Trecho'} · {date}</small><b>{v.game.title}</b>{v.history.ordinal > 1 && <small className="faint">{v.history.title}</small>}</span>
          </Link>
          <h1 className="t snip__title">{v.title}</h1>
          {v.quote && <blockquote className="snip__quote">“{v.quote}”</blockquote>}
          {v.text && <p className="snip__text">{v.text}</p>}
          <footer className="snip__foot">
            <span className="muted">Um trecho da Jornada de <Link to={at}>@{v.owner.handle}</Link></span>
            <span className="snip__acts">
              <Link to={`${at}/${v.game.slug}`} className="btn ghost sm">Ver a Jornada</Link>
              {signedOut ? <Link to="/entrar" className="btn primary sm">Começar a sua</Link> : null}
              <ReportButton kind="momento" handle={v.owner.handle} refId={v.eventId} what="este trecho" snapshot={{ title: v.title, quote: v.quote ?? null, text: v.text ?? null, game: v.game.title }} />
            </span>
          </footer>
        </div>
      </article>
      <p className="faint snip__note">No WinnerZ, cada jogo vira uma história. Quem compartilhou escolheu mostrar só este trecho.</p>
    </main>
  );
}

/** Preferências → Perfil e privacidade: os trechos com link ligado, para conferir e desligar. */
export function SnipLinks() {
  const [rows, setRows] = useState<import('../data/snipApi').SnipRow[] | null>(null);
  const [busy, setBusy] = useState('');
  const load = () => snipApi.mine().then(setRows).catch(() => setRows([]));
  useEffect(() => { void load(); }, []);
  if (!rows) return null;
  return (
    <div className="snip-links">
      {rows.length === 0 ? <p className="muted prefs__p">Nenhum trecho com link. Para compartilhar um momento ou marco, toque nele na sua Jornada e escolha "Compartilhar este trecho".</p> : (
        <ul className="snip-links__list">
          {rows.map((r) => (
            <li key={r.token}>
              <span><Link to={`/t/${r.token}`}>{r.title}</Link><small className="faint"> · {r.game} · {SNIP_KICKER[r.kind] ?? 'Trecho'}{r.views ? ` · ${r.views} ${r.views === 1 ? 'visita' : 'visitas'}` : ''}</small></span>
              <button className="btn quiet sm" disabled={busy === r.token} onClick={() => { setBusy(r.token); void snipApi.off(r.eventId).then(load).finally(() => setBusy('')); }}>Desligar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
