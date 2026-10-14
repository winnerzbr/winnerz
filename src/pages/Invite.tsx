import { useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { INVITE_MSG, cleanCode, invitesApi, setPendingInvite, type RedeemResult } from '../data/invitesApi';
import { BrandMark } from '../components/Brand';
import { navigate } from '../lib/router';

type View = { k: 'carregando' } | { k: 'convite' } | { k: 'pronto' } | { k: 'erro'; msg: string };

/**
 * /convite/<código>: a porta de entrada de quem recebeu um convite com o site fechado.
 * Sem conta: explica e leva para entrar (o código fica guardado até a volta do e-mail).
 * Com conta: usa o convite na hora e abre o site.
 */
export function InvitePage({ code: raw }: { code: string }) {
  const code = cleanCode(raw);
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedIn = mode === 'demo' || !!profile;
  const [view, setView] = useState<View>({ k: 'carregando' });

  useEffect(() => {
    let alive = true;
    const done = (r: RedeemResult) => {
      if (!alive) return;
      if (r === 'ok' || r === 'ja_convidado') { setPendingInvite(null); setView({ k: 'pronto' }); }
      else { setPendingInvite(null); setView({ k: 'erro', msg: r === 'valido' ? INVITE_MSG.invalido : INVITE_MSG[r] }); }
    };
    (async () => {
      try {
        if (signedIn && mode === 'supabase' && !isAdmin) done(await invitesApi.redeem(code));
        else {
          const st = await invitesApi.status(code);
          if (!alive) return;
          setView(st === 'valido' ? { k: 'convite' } : { k: 'erro', msg: INVITE_MSG[st] });
        }
      } catch (e) { if (alive) setView({ k: 'erro', msg: e instanceof Error ? e.message : 'Não deu certo agora. Tente de novo.' }); }
    })();
    return () => { alive = false; };
  }, [code, signedIn, mode, isAdmin]);

  const enter = async () => {
    if (mode === 'demo') {
      const r = await invitesApi.redeem(code);
      setView(r === 'ok' || r === 'ja_convidado' ? { k: 'pronto' } : { k: 'erro', msg: INVITE_MSG[r as keyof typeof INVITE_MSG] ?? INVITE_MSG.invalido });
      return;
    }
    setPendingInvite(code);
    navigate('/entrar');
  };

  return (
    <main className="teaser invite">
      <div className="teaser__glow" aria-hidden="true" />
      <div className="teaser__in invite__in">
        <BrandMark width={120} title="WinnerZ" className="teaser__mark" />
        <div className="teaser__horizon" aria-hidden="true"><span /></div>
        {view.k === 'carregando' && <p className="teaser__soon" role="status">Abrindo o convite…</p>}
        {view.k === 'convite' && (
          <div className="invite__card">
            <p className="invite__kicker">Convite</p>
            <h1 className="invite__title">Você foi convidado para conhecer o WinnerZ antes de todo mundo</h1>
            <p className="invite__lead">O site ainda está fechado. Com este convite você entra com o seu e-mail, sem senha, e já pode guardar as suas Jornadas, a sua coleção e as suas notas.</p>
            {!(mode === 'supabase' && isAdmin) && <button className="btn primary lg" onClick={enter}>Entrar com o meu e-mail</button>}
            {mode === 'demo' && <small className="invite__note">Na demonstração, o convite vale só neste navegador.</small>}
            {mode === 'supabase' && isAdmin && <small className="invite__note">Você é da administração: abrir o link não gasta o convite. É assim que a pessoa convidada vai ver esta tela.</small>}
          </div>
        )}
        {view.k === 'pronto' && (
          <div className="invite__card" role="status">
            <p className="invite__kicker">Tudo certo</p>
            <h1 className="invite__title">Bem-vindo ao WinnerZ</h1>
            <p className="invite__lead">O seu convite está ativo. O site ainda não está aberto ao público, então capriche nas impressões e conte o que achou.</p>
            <button className="btn primary lg" onClick={() => navigate('/')}>Começar</button>
          </div>
        )}
        {view.k === 'erro' && (
          <div className="invite__card" role="alert">
            <p className="invite__kicker">Convite</p>
            <h1 className="invite__title">Não deu para usar este convite</h1>
            <p className="invite__lead">{view.msg}</p>
          </div>
        )}
      </div>
    </main>
  );
}
