import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BrandMark } from '../components/Brand';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { tvApi } from '../tv/tvApi';
import { caminhoSeguro, comecarLogin, eServico, LoginSocial, NOME, useServicos } from '../components/LoginSocial';

function Moldura({ children }: { children: ReactNode }) {
  return (
    <main className="login-page login-page--so">
      <section className="login__side">
        <div className="login">
          <BrandMark width={64} className="login__mini" />
          {children}
        </div>
      </section>
    </main>
  );
}

/** A Steam voltou (api/conta.ts): entra com a entrada de uso único que veio depois do # e segue para onde ia. */
export function EntrarSteam() {
  const [erro, setErro] = useState('');
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    const th = p.get('th') ?? '';
    const volta = caminhoSeguro(p.get('volta'));
    // Tira a entrada do endereço antes de qualquer coisa (não fica no histórico).
    history.replaceState(null, '', location.pathname);
    if (!th) { setErro('Este endereço de entrada não vale mais.'); return; }
    void (async () => {
      try {
        const { getClient } = await import('../data/supabaseAdapter');
        const { error } = await (await getClient()).auth.verifyOtp({ token_hash: th, type: 'magiclink' });
        if (error) { setErro('A entrada pela Steam venceu. Tente de novo.'); return; }
        navigate(volta);
      } catch { setErro('Não deu para entrar agora. Tente de novo.'); }
    })();
  }, []);
  return (
    <Moldura>
      {erro ? (
        <>
          <h1 className="t login__title">Não deu certo</h1>
          <p className="login__lead">{erro}</p>
          <Link className="btn primary lg" to="/entrar">Voltar para a entrada</Link>
        </>
      ) : (
        <>
          <p className="kicker kicker--now">Steam</p>
          <h1 className="t login__title">Entrando…</h1>
          <p className="muted login__lead">Só um instante.</p>
        </>
      )}
    </Moldura>
  );
}

/**
 * No navegador do celular, a pedido do app: entra com o serviço escolhido e confirma que o app pode usar a conta
 * (o mesmo código do Modo TV, que vale 10 minutos). O app fica esperando e entra sozinho.
 */
export function EntrarApp() {
  const profile = useStore((s) => s.profile);
  const servicos = useServicos();
  const q = new URLSearchParams(location.search);
  const code = (q.get('c') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const via = q.get('via');
  const aqui = `/entrar/app?c=${code}`;
  const [estado, setEstado] = useState<'pronto' | 'enviando' | 'feito'>('pronto');
  const [erro, setErro] = useState('');
  const comecou = useRef(false);

  // Sem conta aberta e com o serviço escolhido no app: vai direto para o login dele.
  useEffect(() => {
    if (profile || comecou.current || code.length !== 6 || !eServico(via)) return;
    comecou.current = true;
    void comecarLogin(via, aqui).then((e) => { if (e) setErro(e); });
  }, [profile, code, via, aqui]);

  if (code.length !== 6) {
    return <Moldura><h1 className="t login__title">Endereço incompleto</h1><p className="login__lead">Volte para o app e toque de novo no botão de entrar.</p></Moldura>;
  }
  if (!profile) {
    return (
      <Moldura>
        <p className="kicker">App WinnerZ</p>
        <h1 className="t login__title">Entrar no app</h1>
        <p className="muted login__lead">{eServico(via) && !erro ? `Abrindo o login ${via === 'steam' ? 'da' : 'do'} ${NOME[via]}…` : 'Escolha como entrar. Depois, é só confirmar e voltar para o app.'}</p>
        {(erro || !eServico(via)) && <LoginSocial servicos={servicos} volta={aqui} onErro={setErro} />}
        {erro && <p role="alert" className="login__error">{erro}</p>}
      </Moldura>
    );
  }

  const aprovar = async () => {
    setEstado('enviando'); setErro('');
    try { await tvApi.aprovar(code); setEstado('feito'); } catch (e) { setErro(e instanceof Error ? e.message : 'Não deu certo agora.'); setEstado('pronto'); }
  };
  return (
    <Moldura>
      {estado === 'feito' ? (
        <>
          <p className="kicker kicker--now">Pronto</p>
          <h1 className="t login__title">Pode voltar para o app</h1>
          <p className="muted login__lead">O app já está entrando como {profile.name}. Esta aba pode ser fechada.</p>
        </>
      ) : (
        <>
          <p className="kicker">App WinnerZ</p>
          <h1 className="t login__title">Entrar no app?</h1>
          <p className="muted login__lead">O app WinnerZ deste celular vai usar a conta de <strong>{profile.name}</strong>. Só confirme se foi você que tocou em entrar no app agora.</p>
          <button className="btn primary lg" disabled={estado === 'enviando'} onClick={() => void aprovar()}>{estado === 'enviando' ? 'Confirmando…' : 'Confirmar e voltar ao app'}</button>
          {erro && <p role="alert" className="login__error">{erro}</p>}
        </>
      )}
    </Moldura>
  );
}
