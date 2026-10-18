/**
 * Chamadas à /api/igdb levando o login da pessoa, quando há. Sem login, a API só lê o catálogo:
 * gravar fichas novas, traduzir sinopses, importar e completar fichas pedem conta (e têm limite por dia).
 */
import { getState } from '../data/store';

export async function igdbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  try {
    if (getState().mode === 'supabase') {
      const { accessToken } = await import('../data/supabaseAdapter');
      token = await accessToken();
    }
  } catch { /* sem login: segue só lendo */ }
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
