/**
 * E7.2 · "Drop no ar": quando o canal solta um drop na live, quem está com o site aberto vê o aviso (sem o código,
 * que só aparece na tela da live). Confere a cada 90 segundos com a aba visível; some quando a pessoa já resgatou,
 * quando o drop acaba ou quando ela fecha o aviso.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../../data/store';
import { codeApi, type DropNow } from '../../data/albumApi';
import { Link } from '../../lib/router';

const EVERY = 90_000;
const KEY = 'wz.drop.fechado';

function left(endsAt: string) {
  const s = Math.max(0, Math.round((Date.parse(endsAt) - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function DropBanner({ hidden }: { hidden?: boolean }) {
  const mode = useStore((s) => s.mode);
  const logged = useStore((s) => !!s.profile);
  const ready = useStore((s) => s.ready);
  const [drop, setDrop] = useState<DropNow | null>(null);
  const [closed, setClosed] = useState<string | null>(() => { try { return sessionStorage.getItem(KEY); } catch { return null; } });
  const [, tick] = useState(0);

  useEffect(() => {
    if (!ready || (mode === 'supabase' && !logged)) return;
    let live = true;
    const run = async () => { if (document.visibilityState !== 'visible') return; const d = await codeApi.dropNow(); if (live) setDrop(d); };
    void run();
    const t = setInterval(run, EVERY);
    const vis = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', vis);
    return () => { live = false; clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [ready, mode, logged]);

  const on = !!drop && !drop.mine && closed !== drop.id && Date.parse(drop.endsAt) > Date.now();
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => { tick((n) => n + 1); if (drop && Date.parse(drop.endsAt) <= Date.now()) setDrop(null); }, 1000);
    return () => clearInterval(t);
  }, [on, drop]);
  if (!on || hidden || !drop) return null;
  const hide = () => { try { sessionStorage.setItem(KEY, drop.id); } catch { /* nada */ } setClosed(drop.id); };
  return (
    <aside className="dropbar" role="region" aria-label="Drop no ar">
      <div className="page dropbar__row">
        <span className="dropbar__tag"><i aria-hidden="true" />Drop no ar</span>
        <p><strong>{drop.title}.</strong> O código está na tela da live do WinnerZ{drop.left != null ? ` · restam ${drop.left}` : ''} · <span className="dropbar__time" aria-label="Tempo que falta">{left(drop.endsAt)}</span></p>
        <div className="dropbar__acts">
          <Link className="btn sm now" to="/album/pacotes#codigo" onClick={hide}>Resgatar</Link>
          <button className="btn sm quiet" onClick={hide}>Fechar</button>
        </div>
      </div>
    </aside>
  );
}
