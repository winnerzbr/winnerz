import { useCallback, useEffect, useRef, useState } from 'react';
import { SUPABASE_KEY, SUPABASE_ON, SUPABASE_URL } from '../lib/env';
import { navigate } from '../lib/router';
import { abrirNoNavegador, fecharNavegador, navegadorNoApp, noApp } from '../lib/nativo';
import { tvApi } from '../tv/tvApi';
import { caminhoSeguro, eServico, NOME, servicosDe, type Servico } from '../lib/loginSocial';
export { caminhoSeguro, eServico, ERROS_LOGIN, erroDoEndereco, NOME, servicosDe, type Servico, type ServicoOAuth } from '../lib/loginSocial';

/**
 * Entrar com outros serviços. Google, Discord e Twitch são do próprio Supabase: o botão aparece sozinho assim que o
 * serviço é ligado no painel (Authentication → Sign In / Providers). A Steam usa um login antigo (OpenID 2.0) e quem
 * cuida é a nossa função (/steam/entrar, em api/conta.ts, migração 0091).
 * No app, o login abre no navegador do celular (o Google não deixa entrar dentro de app) e o app espera a confirmação,
 * pelo mesmo caminho do Modo TV.
 */
const CHAVE = 'wz_login_servicos';
/** ID do cliente do Google (é público: aparece na própria página). Com ele, o botão do Google é o oficial, aberto
 *  direto deste site: a janela do Google mostra "Prosseguir para winnerz.com.br" e não o endereço do Supabase. */
const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
/** O botão oficial vale no navegador; dentro do app, o login abre no navegador do celular (e lá usa o oficial). */
export const googleOficial = () => !!GOOGLE_CLIENT_ID && !noApp();

type Gsi = { accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void } } };
let gsi: Promise<Gsi | null> | null = null;
function carregarGsi(): Promise<Gsi | null> {
  gsi ??= new Promise((ok) => {
    const pronto = () => (window as unknown as { google?: Gsi }).google ?? null;
    if (pronto()) { ok(pronto()); return; }
    const sc = document.createElement('script');
    sc.src = 'https://accounts.google.com/gsi/client';
    sc.async = true;
    const t = setTimeout(() => ok(pronto()), 10000);
    sc.onload = () => { clearTimeout(t); ok(pronto()); };
    sc.onerror = () => { clearTimeout(t); gsi = null; ok(null); };
    document.head.appendChild(sc);
  });
  return gsi;
}
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/** O botão oficial do Google (desenhado pelo próprio Google). Entra com o token dele no Supabase (signInWithIdToken). */
function GoogleOficial({ volta, onErro, onFalha }: { volta: string; onErro: (m: string) => void; onFalha: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const g = await carregarGsi();
      if (!vivo || !ref.current) return;
      if (!g) { onFalha(); return; }
      // Número de uso único: o Google assina o resumo dele no token, e o Supabase confere com o original.
      const bruto = hex(crypto.getRandomValues(new Uint8Array(16)));
      const resumo = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bruto)));
      if (!vivo || !ref.current) return;
      try {
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID, nonce: resumo, ux_mode: 'popup', auto_select: false, itp_support: true,
          callback: async ({ credential }: { credential?: string }) => {
            if (!credential) { onErro('O Google não confirmou o login. Tente de novo.'); return; }
            onErro('');
            try {
              const { getClient } = await import('../data/supabaseAdapter');
              const { error } = await (await getClient()).auth.signInWithIdToken({ provider: 'google', token: credential, nonce: bruto });
              if (error) onErro('Não deu para entrar com o Google. Tente de novo ou use o e-mail.');
              else navigate(caminhoSeguro(volta));
            } catch { onErro('Não deu para entrar com o Google. Tente de novo ou use o e-mail.'); }
          },
        });
        const largura = Math.min(400, Math.max(200, Math.round(ref.current.clientWidth || 400)));
        g.accounts.id.renderButton(ref.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: largura, locale: 'pt-BR' });
      } catch { onFalha(); }
    })();
    return () => { vivo = false; };
  }, [volta, onErro, onFalha]);
  return <div ref={ref} className="social__gsi" />;
}

/** Lê o que está ligado no Supabase (e guarda, para os botões não piscarem na próxima visita). */
export function useServicos(): Servico[] {
  const [lista, setLista] = useState<Servico[]>(() => {
    if (!SUPABASE_ON) return [];
    try { const v = JSON.parse(localStorage.getItem(CHAVE) ?? 'null'); if (Array.isArray(v)) return v.filter(eServico); } catch { /* sem armazenamento */ }
    return ['steam'];
  });
  useEffect(() => {
    if (!SUPABASE_ON) return;
    let vivo = true;
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { external?: Record<string, unknown> } | null) => {
        if (!vivo || !j) return;
        const l = servicosDe(j.external);
        setLista(l);
        try { localStorage.setItem(CHAVE, JSON.stringify(l)); } catch { /* sem armazenamento */ }
      })
      .catch(() => { /* sem internet: fica o que já estava */ });
    return () => { vivo = false; };
  }, []);
  // App antigo, sem o plugin do navegador: só o e-mail.
  if (noApp() && !navegadorNoApp()) return [];
  return lista;
}

/** Começa o login no serviço (no navegador). Devolve uma mensagem de erro, se não abriu. */
export async function comecarLogin(s: Servico, volta: string): Promise<string | null> {
  const destino = caminhoSeguro(volta);
  if (s === 'steam') { location.href = `/steam/entrar?volta=${encodeURIComponent(destino)}`; return null; }
  try {
    const { getClient } = await import('../data/supabaseAdapter');
    const { error } = await (await getClient()).auth.signInWithOAuth({ provider: s, options: { redirectTo: `${location.origin}${destino}` } });
    return error ? `Não deu para abrir o login do ${NOME[s]}. Tente de novo ou use o e-mail.` : null;
  } catch { return `Não deu para abrir o login do ${NOME[s]}. Tente de novo ou use o e-mail.`; }
}

/** Marcas oficiais, do jeito que cada serviço pede nos botões de login. */
export function Marca({ s }: { s: Servico }) {
  if (s === 'google') {
    return (
      <svg className="social__mark" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  }
  const d = {
    steam: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z',
    discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
    twitch: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z',
  }[s];
  return <svg className="social__mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={d} /></svg>;
}

type Espera = { code: string; secret: string; servico: Servico; ate: number };

export function LoginSocial({ servicos, volta, onErro }: { servicos: Servico[]; volta: string; onErro: (m: string) => void }) {
  const [indo, setIndo] = useState<Servico | null>(null);
  const [espera, setEspera] = useState<Espera | null>(null);
  const [gsiFalhou, setGsiFalhou] = useState(false);
  const falhou = useCallback(() => setGsiFalhou(true), []);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  // No app: espera o navegador confirmar e entra com a entrada de uso único.
  useEffect(() => {
    if (!espera) return;
    let parar = false;
    const volta1 = async () => {
      if (parar || !vivo.current) return;
      if (Date.now() > espera.ate) { setEspera(null); setIndo(null); onErro('O login demorou demais. Tente de novo.'); return; }
      try {
        const r = await tvApi.esperar(espera.code, espera.secret);
        if (r.pronto && r.tokenHash) {
          parar = true;
          await fecharNavegador();
          await tvApi.entrar(r.tokenHash);
          navigate(caminhoSeguro(volta));
          return;
        }
      } catch (e) {
        const st = (e as { status?: number }).status;
        if (st === 404 || st === 410 || st === 409) { parar = true; setEspera(null); setIndo(null); onErro(e instanceof Error ? e.message : 'Não deu certo. Tente de novo.'); return; }
      }
      if (!parar) setTimeout(volta1, 2500);
    };
    const t = setTimeout(volta1, 2500);
    return () => { parar = true; clearTimeout(t); };
  }, [espera, volta, onErro]);

  if (!servicos.length) return null;

  const entrar = async (s: Servico) => {
    setIndo(s); onErro('');
    if (noApp()) {
      try {
        const { code, secret, expiresIn } = await tvApi.novo();
        await abrirNoNavegador(`${location.origin}/entrar/app?c=${code}&via=${s}`);
        setEspera({ code, secret, servico: s, ate: Date.now() + expiresIn * 1000 });
      } catch (e) { setIndo(null); onErro(e instanceof Error ? e.message : 'Não deu para abrir o navegador.'); }
      return;
    }
    const erro = await comecarLogin(s, volta);
    if (erro) { setIndo(null); onErro(erro); }
  };

  if (espera) {
    return (
      <div className="social social--espera" role="status">
        <p className="login__lead"><strong>Continue no navegador.</strong> Entre com {NOME[espera.servico]} e confirme. Depois disso, o app entra sozinho.</p>
        <div className="social__row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button type="button" className="btn social__btn" onClick={() => void abrirNoNavegador(`${location.origin}/entrar/app?c=${espera.code}&via=${espera.servico}`)}>Abrir de novo</button>
          <button type="button" className="btn social__btn" onClick={() => { setEspera(null); setIndo(null); }}>Cancelar</button>
        </div>
      </div>
    );
  }

  const google = servicos.includes('google');
  const outros = servicos.filter((s) => s !== 'google');
  return (
    <div className="social">
      {google && (googleOficial() && !gsiFalhou ? <GoogleOficial volta={volta} onErro={onErro} onFalha={falhou} /> : (
        // No app (abre o navegador) ou sem o ID do cliente: o mesmo desenho do botão oficial, feito aqui.
        <button type="button" className="social__google" disabled={!!indo} onClick={() => void entrar('google')}>
          <Marca s="google" /><span>{indo === 'google' ? 'Abrindo o Google…' : 'Continuar com o Google'}</span>
        </button>
      ))}
      {outros.length > 0 && (
        <div className="social__row" style={{ gridTemplateColumns: `repeat(${outros.length}, 1fr)` }}>
          {outros.map((s) => (
            <button key={s} type="button" className={`btn social__btn social__btn--${s}`} disabled={!!indo} onClick={() => void entrar(s)} aria-label={`Continuar com ${NOME[s]}`}>
              <Marca s={s} /><span>{indo === s ? 'Abrindo…' : NOME[s]}</span>
            </button>
          ))}
        </div>
      )}
      <p className="social__ou"><span>ou receba um link no e-mail</span></p>
    </div>
  );
}
