/** Modo TV: entrar na TV pelo celular (api/conta.ts, migração 0081). */
const post = async <T,>(body: Record<string, unknown>, auth = false): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${await (await import('../data/supabaseAdapter')).accessToken()}`;
  const r = await fetch('/api/conta', { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})) as T & { error?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? 'Não deu certo agora.'), { status: r.status });
  return j;
};

export const tvApi = {
  /** Na TV: um código novo (vale 10 minutos) e o segredo que só esta TV conhece. */
  novo: () => post<{ code: string; secret: string; expiresIn: number }>({ tv: 'novo' }),
  /** Na TV: o código já foi confirmado no celular? */
  esperar: (code: string, secret: string) => post<{ pronto: boolean; tokenHash?: string }>({ tv: 'esperar', code, secret }),
  /** No celular, com a conta aberta: confirma o código que está na TV. */
  aprovar: (code: string) => post<{ ok: true }>({ tv: 'aprovar', code }, true),
  /** Na TV: entra com a entrada de uso único que o servidor gerou. */
  async entrar(tokenHash: string) {
    const { getClient } = await import('../data/supabaseAdapter');
    const { error } = await (await getClient()).auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
    if (error) throw new Error('Não consegui entrar na TV. Peça um novo código.');
  },
};
