/**
 * Preferências → Discord (J5) e a página /discord/ligar (endereço de verificação dos cargos ligados do servidor).
 */
import { useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { discordApi, type DiscordStatus } from '../data/discordApi';
import { Link } from '../lib/router';
import { dayMonthYear } from '../lib/format';
import { setupNote } from '../lib/setupNote';

export function DiscordSettings() {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const mode = useStore((s) => s.mode);
  const [st, setSt] = useState<DiscordStatus | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(() => {
    const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '').get('discord');
    return q === 'ok' ? 'Discord ligado.' : q === 'cancelado' ? 'Ligação com o Discord cancelada.' : q === 'erro' ? 'Não deu para ligar o Discord. Tente de novo pelo botão daqui, no mesmo navegador.' : '';
  });
  useEffect(() => { discordApi.status().then(setSt).catch(() => setSt(null)); }, []);
  const run = async (f: () => Promise<unknown>, ok?: string) => { setBusy(true); setMsg(''); try { const r = await f(); if (r && typeof r === 'object' && 'linked' in (r as object)) setSt(r as DiscordStatus); if (ok) setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu.'); } setBusy(false); };
  if (st === undefined) return null;
  const row = (k: 'sessions' | 'done' | 'jogatinas', on: boolean, title: string, hint: string) => (
    <label className="motion motion--switch" data-on={on} key={k}>
      <input type="checkbox" role="switch" className="switch" checked={on} disabled={busy} onChange={(e) => run(() => discordApi.setShare({ [k]: e.target.checked }))} />
      <span><strong>{title}</strong><span className="muted">{hint}</span></span>
    </label>
  );
  return (
    <section id="discord" aria-labelledby="discord-h" className="prefs__section">
      <h2 id="discord-h" className="t">Discord</h2>
      {st === null ? (
        <p className="muted prefs__p">{setupNote('Falta rodar a migração 0040 no Supabase para ligar o Discord.')}</p>
      ) : !st.linked ? (
        <>
          <p className="muted prefs__p">Ligue o seu Discord para usar os comandos /parei, /jogando e /jogatina no servidor do WinnerZ, ganhar os cargos ligados (como “Zerou 10 jogos”) e, se quiser, avisar o canal quando jogar, zerar ou marcar uma jogatina.</p>
          <div className="bridge-row__actions"><button className="btn primary" disabled={busy || mode !== 'supabase'} onClick={() => run(() => discordApi.start())}>Entrar com o Discord</button></div>
          {mode !== 'supabase' && <p className="faint bridge-row__hint">Na demonstração não dá para ligar o Discord.</p>}
        </>
      ) : (
        <div className="bridge-row is-on">
          <div className="bridge-row__head">
            {st.avatar && <img className="discord-ava" src={st.avatar} alt="" width={32} height={32} />}
            <strong>{st.username ?? 'Discord'}</strong>
            <span className="chip chip--static">Ligado{st.linkedAt ? ` desde ${dayMonthYear(st.linkedAt)}` : ''}</span>
          </div>
          <p className="muted bridge-row__p">O bot só publica o que você ligar aqui, no canal do servidor do WinnerZ. Nunca vão onde você parou, recados nem pontos para voltar.</p>
          {row('sessions', !!st.shareSessions, 'Avisar quando eu fechar uma sessão', 'O jogo e quanto tempo você jogou.')}
          {row('done', !!st.shareDone, 'Avisar quando eu zerar', 'O jogo zerado, com um GG.')}
          {row('jogatinas', !!st.shareJogatinas, 'Levar minhas jogatinas abertas para o servidor', 'Vira um evento do servidor, com dia, hora e o link da jogatina. Só as abertas.')}
          <div className="bridge-row__actions">
            <button className="btn ghost sm" disabled={busy} onClick={() => run(() => discordApi.roles(), 'Cargos atualizados.')}>Atualizar meus cargos</button>
            <button className="btn quiet sm danger" disabled={busy} onClick={() => run(() => discordApi.unlink(), 'Discord desligado.')}>Desligar</button>
          </div>
        </div>
      )}
      {isAdmin && st !== null && (
        <div className="bridge-row">
          <strong>Administração</strong>
          <p className="muted bridge-row__p">Depois de configurar o aplicativo do Discord na Vercel, cadastre os comandos e os cargos ligados (só precisa uma vez, ou quando eles mudarem).</p>
          <div className="bridge-row__actions"><button className="btn ghost sm" disabled={busy} onClick={() => run(async () => { const r = await discordApi.register(); return r; }, 'Comandos e cargos cadastrados no Discord.')}>Cadastrar comandos e cargos</button></div>
        </div>
      )}
      {msg && <p className="muted bridge-row__msg" role="status">{msg}</p>}
    </section>
  );
}

/** /discord/ligar: o Discord manda a pessoa para cá ao conectar os cargos ligados. */
export function DiscordLinkPage() {
  const logged = useStore((s) => !!s.profile);
  const [err, setErr] = useState('');
  useEffect(() => { if (logged) discordApi.start().catch((e) => setErr(e instanceof Error ? e.message : 'Não deu.')); }, [logged]);
  return (
    <main className="page pad">
      <h1 className="t big">Ligar o Discord</h1>
      {!logged ? (
        <p className="muted">Entre na sua conta do WinnerZ e depois volte por aqui (ou use Preferências → Discord). <Link to="/entrar">Entrar</Link></p>
      ) : err ? <p className="form-error" role="alert">{err}</p> : <p className="muted">Levando você ao Discord…</p>}
    </main>
  );
}
