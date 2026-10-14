import { useEffect, useState, type FormEvent } from 'react';
import { SUPABASE_ON } from '../lib/env';
import { Link, navigate } from '../lib/router';
import { BrandMark } from '../components/Brand';
import { authMessage } from '../lib/authMessage';

/** Lado da arte: a marca pousada na linha do horizonte. */
function LoginArt() {
  return (
    <section className="login__art on-photo" aria-hidden="true">
      <span className="login__glow" />
      <span className="login__line" />
      <BrandMark width={180} className="login__mark" />
      <span className="login__brand"><span className="login__name">WinnerZ</span><span>Onde jogos viram histórias.</span></span>
    </section>
  );
}

export function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [codeErr, setCodeErr] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const request = async () => {
    const { getClient } = await import('../data/supabaseAdapter');
    return (await getClient()).auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin } });
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      const { error } = await request();
      if (error) { setState('error'); setMsg(authMessage(error.message, (error as { status?: number }).status)); } else { setState('sent'); setWait(60); }
    } catch (err) { setState('error'); setMsg(authMessage(err instanceof Error ? err.message : '')); }
  };
  const resend = async () => {
    setCodeErr('');
    try {
      const { error } = await request();
      if (error) setCodeErr(authMessage(error.message, (error as { status?: number }).status)); else { setWait(60); setCodeErr(''); }
    } catch (err) { setCodeErr(authMessage(err instanceof Error ? err.message : '')); }
  };
  /** O código do e-mail serve quando o link abre em outro navegador (comum no celular, dentro do app de e-mail). */
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length < 6) { setCodeErr('O código tem 6 números.'); return; }
    setChecking(true); setCodeErr('');
    try {
      const { getClient } = await import('../data/supabaseAdapter');
      const { error } = await (await getClient()).auth.verifyOtp({ email: email.trim(), token, type: 'email' });
      if (error) setCodeErr(authMessage(error.message, (error as { status?: number }).status));
      else navigate('/');
    } catch (err) { setCodeErr(authMessage(err instanceof Error ? err.message : '')); }
    setChecking(false);
  };

  if (!SUPABASE_ON) {
    return (
      <main className="login-page">
        <LoginArt />
        <section className="login__side">
          <div className="login">
            <p className="kicker">Sua conta</p>
            <h1 className="t login__title">Entrar</h1>
            <p className="muted login__lead">Este site ainda está no modo demonstração, sem contas. Quando o Supabase for configurado, o login por e-mail aparece aqui.</p>
            <Link className="btn primary lg" to="/">Voltar ao início</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <LoginArt />
      <section className="login__side">
        {state === 'sent' ? (
          <div className="login">
            <p className="kicker kicker--now">Link enviado</p>
            <h1 className="t login__title">Confira seu e-mail</h1>
            <p className="login__lead">Enviamos um link para <strong>{email}</strong>. Toque nele para entrar.</p>
            <form className="login__code" onSubmit={verify}>
              <label htmlFor="otp" className="login__label">O link abriu em outro lugar? Digite o código do e-mail</label>
              <input id="otp" className="field login__otp" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="123456"
                value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ''))} />
              <button className="btn primary lg" disabled={checking || code.length < 6}>{checking ? 'Conferindo…' : 'Entrar com o código'}</button>
              {codeErr && <p role="alert" className="login__error">{codeErr}</p>}
            </form>
            <p className="faint login__help">Não chegou? Olhe a caixa de spam e as promoções.{' '}
              {wait > 0 ? <span>Dá para pedir de novo em {wait} s.</span> : <button type="button" className="linklike" onClick={resend}>Mandar de novo</button>}
              {' '}<button type="button" className="linklike" onClick={() => { setState('idle'); setCode(''); setCodeErr(''); }}>Usar outro e-mail</button>
            </p>
          </div>
        ) : (
          <form onSubmit={send} className="login">
            <p className="kicker">Sua conta</p>
            <h1 className="t login__title">Entrar</h1>
            <p className="muted login__lead">Sem senha. Mandamos um link e um código de acesso para o seu e-mail, e suas Jornadas ficam em todos os seus aparelhos.</p>
            <label htmlFor="email" className="login__label">E-mail</label>
            <input id="email" className="field" type="email" required autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn primary lg" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Receber link de acesso'}</button>
            {state === 'error' && <p role="alert" className="login__error">{msg}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
