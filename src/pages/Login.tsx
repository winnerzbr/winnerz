import { useState, type FormEvent } from 'react';
import { SUPABASE_ON } from '../lib/env';
import { Link } from '../lib/router';
import { BrandMark } from '../components/Brand';

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

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setState('sending');
    const { getClient } = await import('../data/supabaseAdapter');
    const { error } = await (await getClient()).auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } });
    if (error) { setState('error'); setMsg(error.message); } else setState('sent');
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
            <p className="login__lead">Enviamos um link para <strong>{email}</strong>. Abra o e-mail neste aparelho para entrar.</p>
          </div>
        ) : (
          <form onSubmit={send} className="login">
            <p className="kicker">Sua conta</p>
            <h1 className="t login__title">Entrar</h1>
            <p className="muted login__lead">Sem senha. Mandamos um link de acesso para o seu e-mail, e suas Jornadas ficam em todos os seus aparelhos.</p>
            <label htmlFor="email" className="login__label">E-mail</label>
            <input id="email" className="field" type="email" required autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn primary lg" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Receber link de acesso'}</button>
            {state === 'error' && <p role="alert" className="login__error">Não foi possível enviar: {msg}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
