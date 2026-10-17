import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { actions, useStore } from '../data/store';
import { HANDLE_RE, profileApi } from '../data/profileApi';
import { BrandMark } from './Brand';
import { moderationApi, useModeration } from '../data/moderationApi';

const ArrivalGate = lazy(() => import('../pages/Arrival').then((m) => ({ default: m.ArrivalGate })));

/**
 * Primeiro acesso: antes de usar o site, a pessoa escolhe o @, que passa a ser o nome dela no site inteiro
 * (vale para quem entra por e-mail ou, no futuro, pelo Google). Sem a migração 0011/0012 no banco, não bloqueia nada.
 */
export function NickGate({ children }: { children: ReactNode }) {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const [need, setNeed] = useState<boolean | undefined>(mode === 'supabase' && profile ? undefined : false);

  useEffect(() => {
    if (mode !== 'supabase' || !profile) { setNeed(false); return; }
    profileApi.mine().then((p) => setNeed(!!p && !p.handle)).catch(() => setNeed(false));
  }, [mode, profile?.id]);

  if (need === undefined) return <div className="boot" aria-busy="true"><BrandMark width={64} title="WinnerZ" /></div>;
  if (!need) return <>{children}</>;
  return <FirstAccess suggestion={profile?.name ?? ''} onDone={() => setNeed(false)} />;
}

/** Conta nova: a primeira tela da Chegada (o @). Quando a moderação pede outro @, a tela simples explica o motivo. */
function FirstAccess({ suggestion, onDone }: { suggestion: string; onDone: () => void }) {
  const modNotice = useModeration()?.notices.find((n) => n.kind === 'trocar_arroba');
  if (modNotice) return <NickSetup suggestion={suggestion} onDone={onDone} />;
  return <Suspense fallback={<div className="boot" aria-busy="true"><BrandMark width={64} title="WinnerZ" /></div>}><ArrivalGate suggestion={suggestion} onDone={onDone} /></Suspense>;
}

function NickSetup({ suggestion, onDone }: { suggestion: string; onDone: () => void }) {
  const [nick, setNick] = useState(() => suggestion.replace(/[^A-Za-z0-9_]/g, '').slice(0, 24));
  const [free, setFree] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);
  // Quando a moderação pediu outro @, a tela explica o motivo em vez de dizer "primeiro acesso".
  const modNotice = useModeration()?.notices.find((n) => n.kind === 'trocar_arroba');
  const h = nick.trim();
  const valid = HANDLE_RE.test(h);

  useEffect(() => {
    setFree(null);
    if (!valid) return;
    const n = ++seq.current;
    const t = setTimeout(() => { profileApi.available(h).then((ok) => { if (n === seq.current) setFree(ok); }).catch(() => { /* confere ao gravar */ }); }, 350);
    return () => clearTimeout(t);
  }, [h, valid]);

  const go = async () => {
    if (!valid || busy) return;
    setBusy(true); setError('');
    try {
      const p = await profileApi.setHandle(h);
      actions.setProfileName(p.handle ?? h);
      if (modNotice) void moderationApi.ack(modNotice.id).catch(() => {});
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não deu certo.'); setBusy(false); }
  };

  return (
    <main className="nick">
      <div className="nick__glow" aria-hidden="true" />
      <form className="nick__box" onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <BrandMark width={56} className="nick__logo" />
        <span className="kicker">{modNotice ? 'Aviso da moderação' : 'Primeiro acesso'}</span>
        <h1 className="t nick__title">{modNotice ? 'Escolha um novo @' : 'Escolha o seu @'}</h1>
        <p className="nick__lead">{modNotice ? modNotice.text : 'É o seu nome no WinnerZ: aparece no cabeçalho, nas suas análises e no endereço do seu perfil. Dá para trocar depois em Preferências.'}</p>
        <label className="nick__field">
          <span className="nick__at" aria-hidden="true">@</span>
          <input className="field" value={nick} onChange={(e) => setNick(e.target.value.replace(/\s/g, ''))} maxLength={24} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Seu @" aria-invalid={!!h && !valid} />
        </label>
        <p className={`nick__hint${(h && !valid) || free === false ? ' is-bad' : free ? ' is-ok' : ''}`} role="status">
          {!h ? 'De 3 a 24 letras, números ou _.'
            : !valid ? 'Use só letras sem acento, números ou _, de 3 a 24.'
            : free === false ? 'Esse @ não está disponível. Tente outro.'
            : free ? `Livre. Seu perfil: winnerz.com.br/@${h.toLowerCase()}`
            : 'Conferindo…'}
        </p>
        {error && <p className="awards__error" role="alert">{error}</p>}
        <button className="btn primary lg" disabled={!valid || free === false || busy}>{busy ? 'Gravando…' : 'Continuar'}</button>
      </form>
    </main>
  );
}
