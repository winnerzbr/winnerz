import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { noApp } from '../lib/nativo';
import { ERROS_LOGIN, Marca, NOME, useServicos, type Servico, type ServicoOAuth } from './LoginSocial';

type Identidade = { provider: string; identity_id: string; id: string; user_id: string; [k: string]: unknown };

/**
 * Preferências → Conta → Contas ligadas: entrar com Google, Discord, Twitch ou Steam na mesma conta.
 * Google, Discord e Twitch são do Supabase (linkIdentity: precisa de "Allow manual linking" ligado no painel).
 * A Steam é nossa (api/conta.ts, migração 0091).
 */
export function ContasLigadas() {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const servicos = useServicos();
  const [ids, setIds] = useState<Identidade[] | null>(null);
  const [steam, setSteam] = useState<boolean | null>(null);
  const [soSteam, setSoSteam] = useState(false);
  const [busy, setBusy] = useState<Servico | null>(null);
  const [msg, setMsg] = useState(() => {
    if (/[?&]steam=ligada/.test(location.search)) return 'Steam ligada. Agora dá para entrar com ela também.';
    const m = /[#&]erro=([a-z-]+)/.exec(location.hash);
    return m ? (ERROS_LOGIN[m[1]] ?? 'Não deu certo. Tente de novo.') : '';
  });

  const carregar = useCallback(async () => {
    const { getClient } = await import('../data/supabaseAdapter');
    const sb = await getClient();
    const [{ data }, u, st] = await Promise.all([
      sb.auth.getUserIdentities().catch(() => ({ data: null })),
      sb.auth.getUser().catch(() => null),
      sb.from('steam_logins').select('steam_id').maybeSingle(),
    ]);
    setIds(((data as { identities?: Identidade[] } | null)?.identities ?? []) as Identidade[]);
    setSoSteam(/@steam\.winnerz\.com\.br$/i.test(u?.data.user?.email ?? ''));
    setSteam(st.error ? null : !!st.data);
  }, []);
  useEffect(() => { if (mode === 'supabase' && profile) void carregar(); }, [mode, profile, carregar]);

  if (mode !== 'supabase' || !profile) return null;

  const token = async () => (await import('../data/supabaseAdapter')).accessToken();
  const ligar = async (s: Servico) => {
    setBusy(s); setMsg('');
    try {
      if (s === 'steam') {
        const r = await fetch('/api/conta', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ steam: 'ligar' }) });
        const j = await r.json().catch(() => ({})) as { url?: string; error?: string };
        if (!r.ok || !j.url) throw new Error(j.error ?? 'Não deu certo agora.');
        location.href = j.url;
        return;
      }
      const { getClient } = await import('../data/supabaseAdapter');
      const { error } = await (await getClient()).auth.linkIdentity({ provider: s as ServicoOAuth, options: { redirectTo: `${location.origin}/preferencias#contas` } });
      if (error) throw new Error(/manual linking/i.test(error.message) ? 'Ligar contas ainda está desligado no Supabase (Authentication → Sign In / Providers → "Allow manual linking").' : 'Não deu certo agora. Tente de novo.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); setBusy(null); }
  };
  const desligar = async (s: Servico) => {
    setBusy(s); setMsg('');
    try {
      if (s === 'steam') {
        const r = await fetch('/api/conta', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ steam: 'desligar' }) });
        const j = await r.json().catch(() => ({})) as { error?: string };
        if (!r.ok) throw new Error(j.error ?? 'Não deu certo agora.');
      } else {
        const id = ids?.find((x) => x.provider === s);
        if (!id) return;
        const { getClient } = await import('../data/supabaseAdapter');
        const { error } = await (await getClient()).auth.unlinkIdentity(id as never);
        if (error) throw new Error('Não deu para desligar agora. Tente de novo.');
      }
      await carregar();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); }
    setBusy(null);
  };

  const ligado = (s: Servico) => (s === 'steam' ? !!steam : !!ids?.some((x) => x.provider === s));
  // Só dá para tirar um login se sobrar outro jeito de entrar.
  const formas = (ids?.length ?? 0) + (steam && !soSteam ? 1 : 0);
  const podeDesligar = (s: Servico) => (s === 'steam' ? !soSteam : formas > 1);

  return (
    <div className="acct contas" id="contas">
      <p className="acct__title">Contas ligadas</p>
      <p className="muted prefs__p">Entre no WinnerZ com qualquer uma delas: tudo cai nesta mesma conta.</p>
      {ids === null ? <p className="faint">Carregando…</p> : (
        <ul className="contas__lista">
          {servicos.map((s) => (
            <li key={s} className="contas__item">
              <span className="contas__nome"><Marca s={s} />{NOME[s]}</span>
              {ligado(s) ? (
                <span className="contas__acao"><span className="muted">Ligada</span>
                  {podeDesligar(s) && !noApp() && <button className="btn quiet sm" disabled={!!busy} onClick={() => void desligar(s)}>{busy === s ? 'Um instante…' : 'Desligar'}</button>}
                </span>
              ) : noApp() ? <span className="faint">Ligue pelo site, no navegador</span> : (
                <button className="btn ghost sm" disabled={!!busy || (s === 'steam' && steam === null)} onClick={() => void ligar(s)}>{busy === s ? 'Abrindo…' : 'Ligar'}</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="muted prefs__p" role="status">{msg}</p>}
    </div>
  );
}
