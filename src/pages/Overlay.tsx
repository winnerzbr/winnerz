import { useEffect, useState } from 'react';
import { useStore, openSession, focusJourneys, sessionsOf } from '../data/store';
import { hourMin } from '../lib/format';

type Data = { game: { title: string; cover: string } | null; session: { startedAt: string; number: number } | null; moment: { title: string; text?: string | null; image?: string | null; kind: string } | null };

/**
 * Overlay de live: fonte de navegador do OBS (fundo transparente). Atualiza sozinho a cada 20 segundos.
 * `/overlay/demo` mostra o que está neste navegador (para testar o visual).
 */
export function OverlayPage({ k }: { k: string }) {
  const s = useStore((x) => x);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');

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
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [k]);

  // Prévia local: mesmo visual, com os dados deste navegador.
  const local: Data | null = k === 'demo' ? (() => {
    const open = openSession(s);
    const j = open ? s.journeys.find((x) => x.id === open.journeyId) : focusJourneys(s)[0]?.journey;
    const g = j ? s.games[j.gameId] : undefined;
    const m = j ? [...s.events].filter((e) => e.journeyId === j.id && (e.kind === 'momento' || e.kind === 'ponto')).sort((a, b) => b.at.localeCompare(a.at))[0] : undefined;
    return { game: g ? { title: g.title, cover: g.cover } : null, session: open ? { startedAt: open.startedAt, number: sessionsOf(s, open.historyId).length } : null, moment: m ? { title: m.title, text: m.quote ?? m.text, image: m.image, kind: m.kind } : null };
  })() : null;
  const d = local ?? data;

  if (err) return <div className="ovl ovl--err">{err}</div>;
  if (!d?.game) return <div className="ovl ovl--empty" />;
  return (
    <div className="ovl">
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
        <img className="ovl__logo" src="/brand/logo-mark.webp" alt="WinnerZ" />
      </div>
    </div>
  );
}
