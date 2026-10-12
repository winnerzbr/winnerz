import { useEffect, useState } from 'react';
import { isOutdated } from '../lib/version';

/** Aviso discreto quando o site foi atualizado e esta página ainda roda a versão antiga. */
export function UpdateBanner() {
  const [old, setOld] = useState(false);
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') isOutdated().then((o) => o && setOld(true)); };
    check();
    const t = setInterval(check, 5 * 60_000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); };
  }, []);
  if (!old) return null;
  return (
    <div className="update-bar" role="status">
      O WinnerZ foi atualizado. <button onClick={() => location.reload()}>Recarregar a página</button>
    </div>
  );
}
