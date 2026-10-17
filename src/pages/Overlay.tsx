import { useEffect, useState } from 'react';
import { useStore, openSession, focusJourneys, sessionsOf } from '../data/store';
import { hourMin } from '../lib/format';
import { demoDrop } from '../data/albumApi';
import { awardsApi, awardsPlus } from '../data/awards';

type Drop = { code: string; title: string; endsAt: string; left: number | null; kind: 'pacote' | 'figurinha'; packKind: 'onix' | 'prisma' };
type Reveal = { award: string; category: string; step: 'categoria' | 'indicados' | 'vencedor'; nominees: { title: string; cover: string | null }[]; winner: { title: string; cover: string | null } | null };
type Data = { game: { title: string; cover: string } | null; session: { startedAt: string; number: number } | null; moment: { title: string; text?: string | null; image?: string | null; kind: string } | null; drop?: Drop | null; reveal?: Reveal | null };

/**
 * Overlay de live: fonte de navegador do OBS (fundo transparente). Atualiza sozinho a cada 20 segundos.
 * `/overlay/demo` mostra o que está neste navegador (para testar o visual).
 * E7.2: no overlay do canal, o drop de figurinhas no ar entra por cima, com o código e a contagem.
 */
export function OverlayPage({ k }: { k: string }) {
  const s = useStore((x) => x);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [, tick] = useState(0);
  const [demoD, setDemoD] = useState(() => (k === 'demo' ? demoDrop() : null));
  const [demoR, setDemoR] = useState<Reveal | null>(null);
  // Prévia: a revelação que a apresentação deste navegador está mostrando.
  useEffect(() => {
    if (k !== 'demo') return;
    const t = setInterval(async () => {
      const r = awardsPlus.demoReveal();
      if (!r || r.step === 'fim' || !r.categoryId) { setDemoR(null); return; }
      const f = await awardsApi().load(r.awardId).catch(() => null);
      const c = f?.categories.find((x) => x.id === r.categoryId);
      if (!f || !c) { setDemoR(null); return; }
      const top = r.step === 'vencedor' && f.results ? [...c.nominees].sort((a, b) => (f.results![b.id] ?? 0) - (f.results![a.id] ?? 0))[0] : undefined;
      setDemoR({ award: f.award.title, category: c.name, step: top ? 'vencedor' : r.step === 'vencedor' ? 'indicados' : r.step, nominees: c.nominees.map((n) => ({ title: n.game.title, cover: n.game.cover })), winner: top ? { title: top.game.title, cover: top.game.cover } : null });
    }, 1000);
    return () => clearInterval(t);
  }, [k]);
  useEffect(() => { const t = setInterval(() => { tick((n) => n + 1); if (k === 'demo') setDemoD(demoDrop()); }, 1000); return () => clearInterval(t); }, [k]);

  useEffect(() => {
    document.documentElement.classList.add('is-overlay');
    return () => document.documentElement.classList.remove('is-overlay');
  }, []);

  useEffect(() => {
    if (k === 'demo') return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/overlay?k=${encodeURIComponent(k)}`, { cache: 'no-store' });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) setErr(j.error ?? 'Overlay indisponível.'); else { setData(j); setErr(''); }
      } catch { /* sem rede: tenta de novo no próximo ciclo */ }
    };
    void load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [k]);

  // Prévia local: mesmo visual, com os dados deste navegador.
  const local: Data | null = k === 'demo' ? (() => {
    const open = openSession(s);
    const j = open ? s.journeys.find((x) => x.id === open.journeyId) : focusJourneys(s)[0]?.journey;
    const g = j ? s.games[j.gameId] : undefined;
    const m = j ? [...s.events].filter((e) => e.journeyId === j.id && (e.kind === 'momento' || e.kind === 'ponto')).sort((a, b) => b.at.localeCompare(a.at))[0] : undefined;
    return { game: g ? { title: g.title, cover: g.cover } : null, session: open ? { startedAt: open.startedAt, number: sessionsOf(s, open.historyId).length } : null, moment: m ? { title: m.title, text: m.quote ?? m.text, image: m.image, kind: m.kind } : null, drop: demoD, reveal: demoR };
  })() : null;
  const d = local ?? data;

  if (err) return <div className="ovl ovl--err">{err}</div>;
  const drop = d?.drop && Date.parse(d.drop.endsAt) > Date.now() ? d.drop : null;
  const dropCard = drop && <DropCard key={drop.code} drop={drop} />;
  const revealCard = d?.reveal && <RevealCard key={`${d.reveal.category}-${d.reveal.step}`} r={d.reveal} />;
  if (revealCard) return <div className="ovl">{dropCard}{revealCard}</div>;
  if (!d?.game) return dropCard ? <div className="ovl">{dropCard}</div> : <div className="ovl ovl--empty" />;
  return (
    <div className="ovl">
      {dropCard}
      <div className="ovl__card">
        {d.game.cover && <img className="ovl__cover" src={d.game.cover} alt="" />}
        <div className="ovl__info">
          <span className="ovl__k">{d.session ? <><span className="ovl__dot" />Jogando agora</> : 'Em foco'}</span>
          <strong className="ovl__title">{d.game.title}</strong>
          {d.session && <span className="ovl__sub">Sessão {d.session.number}, desde {hourMin(d.session.startedAt)}</span>}
        </div>
        {d.moment && (
          <div className="ovl__moment">
            {d.moment.image && <img src={d.moment.image} alt="" />}
            <span><span className="ovl__k">{d.moment.kind === 'ponto' ? 'Quero voltar aqui' : 'Último momento'}</span><span className="ovl__mt">{d.moment.title}</span></span>
          </div>
        )}
        <img className="ovl__logo" src="/brand/forjado.svg" alt="WinnerZ" />
      </div>
    </div>
  );
}

/** O drop na tela da live: o código grande, o endereço curto e o tempo que falta. */
function DropCard({ drop }: { drop: Drop }) {
  const sec = Math.max(0, Math.round((Date.parse(drop.endsAt) - Date.now()) / 1000));
  const what = drop.kind === 'figurinha' ? 'uma figurinha' : drop.packKind === 'prisma' ? 'um pacote especial' : 'um pacote de figurinhas';
  return (
    <div className="ovl-drop" role="status">
      <span className="ovl-drop__tag"><i aria-hidden="true" />Drop no ar</span>
      <strong className="ovl-drop__title">{drop.title}</strong>
      <span className="ovl-drop__what">Vale {what}{drop.left != null ? ` · restam ${drop.left}` : ''}</span>
      <span className="ovl-drop__code">{drop.code}</span>
      <span className="ovl-drop__where">winnerz.com.br/codigo</span>
      <span className="ovl-drop__time">{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</span>
      <span className="ovl-drop__bar" aria-hidden="true"><i style={{ animationDuration: `${sec}s` }} /></span>
    </div>
  );
}

/** A revelação do WinnerZ Awards na tela da live: a categoria, os indicados e, no passo certo, o vencedor. */
function RevealCard({ r }: { r: Reveal }) {
  return (
    <div className={`ovl-aw is-${r.step}`} role="status">
      <span className="ovl-aw__k">{r.award}</span>
      <strong className="ovl-aw__cat">{r.category}</strong>
      {r.winner ? (
        <div className="ovl-aw__win">
          {r.winner.cover && <img src={r.winner.cover} alt="" />}
          <span><span className="ovl-aw__tag">Vencedor</span><b>{r.winner.title}</b></span>
        </div>
      ) : (
        <ul className="ovl-aw__noms">{r.nominees.slice(0, 6).map((n) => <li key={n.title}>{n.cover && <img src={n.cover} alt="" />}<span>{n.title}</span></li>)}</ul>
      )}
    </div>
  );
}
