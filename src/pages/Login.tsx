import { useState, type FormEvent } from 'react';
import { SUPABASE_ON } from '../lib/env';
import { Link } from '../lib/router';

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
      <main className="page pad narrow">
        <h1 className="t big">Entrar</h1>
        <p className="muted lead">Este site ainda está no modo demonstração, sem contas. Quando o Supabase for configurado, o login por e-mail aparece aqui.</p>
        <Link className="btn primary" to="/">Voltar ao início</Link>
      </main>
    );
  }

  return (
    <main className="page pad narrow">
      <h1 className="t big">Entrar</h1>
      {state === 'sent' ? (
        <p className="lead">Enviamos um link para <strong>{email}</strong>. Abra o e-mail neste aparelho para entrar.</p>
      ) : (
        <form onSubmit={send} className="login">
          <label htmlFor="email">Seu e-mail</label>
          <input id="email" className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn primary lg" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Receber link de acesso'}</button>
          <p className="muted">Sem senha: você recebe um link de acesso por e-mail.</p>
          {state === 'error' && <p role="alert" style={{ color: 'var(--accent-ink)' }}>Não foi possível enviar: {msg}</p>}
        </form>
      )}
    </main>
  );
}
