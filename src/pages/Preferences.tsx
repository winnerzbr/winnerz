import { useEffect, useState } from 'react';
import { BridgeSettings } from '../components/Bridges';
import { TONES } from '../lib/tone';
import { actions, useStore } from '../data/store';
import { Stars } from '../components/Stars';
import { darkTokens, lightTokens, WHITE_DEFAULT } from '../lib/theme';
import { formatScore, normalize, scaleMax } from '../lib/rating';
import { SUPABASE_ON } from '../lib/env';
import { resetDemo } from '../data/demoAdapter';
import { DeleteAccount, ExportData } from '../components/AccountData';
import { ProfileSettings } from '../components/ProfileSettings';
import { BlockedList } from '../components/Moderation';
import { Link } from '../lib/router';
import type { CommunityPrefs } from '../data/types';
import { refreshNews } from '../data/communityApi';
import { refreshNotifs } from '../data/notifApi';

const SAMPLES = [
  { who: 'Uma nota 9,5 de 0 a 10', r: normalize(9.5, 'TEN_POINT') },
  { who: 'Uma nota de 4,5 estrelas', r: normalize(4.5, 'FIVE_STAR') },
  { who: 'Uma nota 8,5 de 0 a 10', r: normalize(8.5, 'TEN_POINT') },
];

export function Preferences() {
  const prefs = useStore((s) => s.prefs);
  const profile = useStore((s) => s.profile);
  const isAdmin = useStore((s) => !!s.isAdmin);
  // Links como /preferencias#perfil (vindos dos primeiros passos) abrem já na seção certa.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, []);
  const preview = darkTokens(prefs.black);
  const white = prefs.white ?? WHITE_DEFAULT;
  const lightPreview = lightTokens(white);

  const signOut = async () => {
    const { getClient } = await import('../data/supabaseAdapter');
    await (await getClient()).auth.signOut();
  };

  return (
    <main className="page pad prefs">
      <aside className="prefs__aside">
        <p className="kicker">{profile ? 'Preferências de' : 'Suas'}</p>
        <h1 className="t prefs__name">{profile ? profile.name : 'Preferências'}</h1>
        <nav className="prefs__nav" aria-label="Seções das preferências">
          <a href="#tema">Aparência e notas</a><a href="#mov">Animações</a><a href="#leve">Modo leve</a><a href="#tom">Celebrações</a><a href="#ovl-h">Overlay de live</a><a href="#comunidade">Comunidade</a><a href="#perfil">Perfil e privacidade</a><a href="#dados">Seus dados</a><a href="#conta">Conta</a>
        </nav>
      </aside>
      <div className="prefs__main">
      <section aria-labelledby="tema" className="prefs__section prefs__section--first">
        <h2 id="tema" className="t">Aparência e notas</h2>
        <p className="muted prefs__p">Vale para todos os seus aparelhos. A página muda na hora para você ver o resultado.</p>
        <h3 className="prefs__sub">Tema</h3>
        <div className="themes">
          <button className="theme-card" aria-pressed={prefs.theme === 'escuro'} onClick={() => actions.setPrefs({ theme: 'escuro' })}>
            <span className="theme-card__mini" aria-hidden="true" style={{ background: preview['--bg'] }}>
              <span style={{ background: '#E6E9ED', width: '50%' }} /><span style={{ background: '#474D55', width: '70%' }} />
              <span className="theme-card__blocks"><i style={{ background: preview['--surface'] }} /><i style={{ background: preview['--surface'] }} /><b /></span>
            </span>
            Escuro
          </button>
          <button className="theme-card" aria-pressed={prefs.theme === 'claro'} onClick={() => actions.setPrefs({ theme: 'claro' })}>
            <span className="theme-card__mini theme-card__mini--light" aria-hidden="true" style={{ background: lightPreview['--bg'] }}>
              <span style={{ background: '#0B0D10', width: '50%' }} /><span style={{ background: lightPreview['--line-2'], width: '70%' }} />
              <span className="theme-card__blocks"><i style={{ background: lightPreview['--surface'] }} /><i style={{ background: lightPreview['--surface'] }} /><b /></span>
            </span>
            Claro
          </button>
        </div>
        {prefs.theme === 'escuro' && (
          <div className="card black-card">
            <label htmlFor="preto" className="black-card__label">Intensidade do preto <span className="t">{prefs.black}%</span></label>
            <input id="preto" className="range lg" type="range" min={0} max={100} value={prefs.black} style={{ ['--p' as string]: `${prefs.black}%` }} onChange={(e) => actions.setPrefs({ black: Number(e.target.value) })} />
            <div className="black-card__ends"><span>Grafite, mais suave</span><span>Preto absoluto, ideal para telas OLED</span></div>
          </div>
        )}
        {prefs.theme === 'claro' && (
          <div className="card black-card">
            <label htmlFor="branco" className="black-card__label">Intensidade do branco <span className="t">{white}%</span></label>
            <input id="branco" className="range lg" type="range" min={0} max={100} value={white} style={{ ['--p' as string]: `${white}%` }} onChange={(e) => actions.setPrefs({ white: Number(e.target.value) })} />
            <div className="black-card__ends"><span>Cinza suave, menos brilho</span><span>Branco puro, mais contraste</span></div>
          </div>
        )}
      </section>

      <section aria-labelledby="notas" className="prefs__section prefs__section--sub">
        <h3 id="notas" className="prefs__sub">Escala das notas</h3>
        <p className="muted prefs__p">A nota pertence a quem avaliou; a escala pertence a quem está vendo. Nada é arredondado: uma nota 8,5 aparece como 4,25 estrelas, com a estrela preenchida na medida certa.</p>
        <div className="seg" role="group" aria-label="Escala das notas">
          <button aria-pressed={prefs.scale === 'TEN_POINT'} onClick={() => actions.setPrefs({ scale: 'TEN_POINT' })}>De 0 a 10</button>
          <button aria-pressed={prefs.scale === 'FIVE_STAR'} onClick={() => actions.setPrefs({ scale: 'FIVE_STAR' })}>5 estrelas</button>
        </div>
        <ul className="samples">
          {SAMPLES.map((x) => (
            <li key={x.who}>
              <span>{x.who}</span>
              {prefs.scale === 'FIVE_STAR' && <Stars normalized={x.r.normalized} size={20} />}
              <span className="t">{formatScore(x.r.normalized, prefs.scale)}<span className="muted">/{scaleMax(prefs.scale)}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mov" className="prefs__section">
        <h2 id="mov" className="t">Animações</h2>
        <div role="radiogroup" aria-labelledby="mov" className="motions">
          {([
            ['completas', 'Completas', 'Celebrações, energia ao favoritar, linha do tempo cinematográfica.'],
            ['discretas', 'Discretas', 'Só confirmações curtas. Celebrações sem partículas.'],
            ['reduzidas', 'Reduzidas', 'Sem movimento: trocas instantâneas. Também vale quando o sistema pede menos movimento.'],
          ] as const).map(([id, label, desc]) => (
            <label key={id} className="motion" data-on={prefs.motion === id}>
              <input type="radio" name="mov" checked={prefs.motion === id} onChange={() => actions.setPrefs({ motion: id })} />
              <span><strong>{label}</strong><span className="muted">{desc}</span></span>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="leve" className="prefs__section">
        <h2 id="leve" className="t">Modo leve</h2>
        <label className="motion motion--switch" data-on={!!prefs.light}>
          <input type="checkbox" role="switch" className="switch" checked={!!prefs.light} onChange={(e) => actions.setPrefs({ light: e.target.checked })} />
          <span><strong>Esconder contadores e números</strong><span className="muted">Sem total de sessões, horas, jogos na estante ou quantos você zerou. Fica a história, sem placar. As estatísticas da coleção continuam lá, só se você abrir.</span></span>
        </label>
      </section>

      <section aria-labelledby="tom" className="prefs__section">
        <h2 id="tom" className="t">Tom das celebrações</h2>
        <p className="muted">Como o WinnerZ comemora com você. A festa grande fica só para quando você zera; os outros marcos ganham uma mensagem curta.</p>
        <div role="radiogroup" aria-labelledby="tom" className="motions">
          {TONES.map((t) => (
            <label key={t.id} className="motion" data-on={(prefs.tone ?? 'encorajadora') === t.id}>
              <input type="radio" name="tom" checked={(prefs.tone ?? 'encorajadora') === t.id} onChange={() => actions.setPrefs({ tone: t.id })} />
              <span><strong>{t.label}</strong><span className="muted">{t.desc} Ex.: “{t.sample}”</span></span>
            </label>
          ))}
        </div>
      </section>

      <OverlaySettings />

      <BridgeSettings />
      <CommunitySettings />
      <NotifSettings />

      <section className="prefs__section" aria-labelledby="perfil">
        <h2 id="perfil" className="t">Perfil e privacidade</h2>
        <ProfileSettings />
        <h3 className="prefs__sub" id="bloqueios">Pessoas bloqueadas e silenciadas</h3>
        <BlockedList />
      </section>

      <section className="prefs__section" aria-labelledby="dados">
        <h2 id="dados" className="t">Seus dados</h2>
        <ExportData />
        <p className="muted prefs__p">O que guardamos, por quê e o que você pode fazer: <Link to="/privacidade">Privacidade</Link>. De onde vêm as informações dos jogos: <Link to="/sobre">Sobre o WinnerZ</Link>.</p>
      </section>

      {isAdmin && (
        <section className="prefs__section" aria-labelledby="adm">
          <h2 id="adm" className="t">Administração</h2>
          <div className="prefs__admin">
            <Link className="btn primary" to="/studio">Abrir o Studio</Link>
            <Link className="btn ghost" to="/studio/correcoes">Correções</Link>
            <Link className="btn ghost" to="/eventos/awards/admin">Montar o WinnerZ Awards</Link>
          </div>
        </section>
      )}
      <section className="prefs__section" aria-labelledby="conta">
        <h2 id="conta" className="t">Conta</h2>
        {SUPABASE_ON ? (
          profile ? <button className="btn ghost" onClick={signOut}>Sair da conta</button> : <a className="btn primary" href="/entrar">Entrar</a>
        ) : (
          <p className="muted prefs__p">Você está no modo demonstração: tudo fica neste navegador. <button className="btn quiet sm" onClick={resetDemo}>Recomeçar a demonstração</button></p>
        )}
        <DeleteAccount />
      </section>
      </div>
    </main>
  );
}

/** Overlay de live: endereço assinado para a fonte de navegador do OBS. */
function OverlaySettings() {
  const mode = useStore((x) => x.mode);
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const make = async (rotate = false) => {
    setState('busy');
    try {
      const { accessToken } = await import('../data/supabaseAdapter');
      const r = await fetch('/api/overlay', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify({ link: true, rotate }) });
      if (!r.ok) throw new Error();
      const path: string = (await r.json()).path;
      // Guarda o segredo também aqui, para a próxima mudança de preferência não apagá-lo.
      actions.setPrefs({ overlayNonce: path.split('.')[1] });
      setUrl(`${location.origin}${path}`); setState('idle');
    } catch { setState('error'); }
  };
  return (
    <section aria-labelledby="ovl-h" className="prefs__section">
      <h2 id="ovl-h" className="t">Overlay de live</h2>
      <p className="muted">Uma fonte de navegador para o OBS com o jogo em foco, a sessão aberta e o último momento guardado. Fundo transparente; atualiza sozinho. <a href="/overlay/demo" target="_blank" rel="noreferrer">Ver como fica</a>.</p>
      {mode !== 'supabase' ? <p className="faint">Disponível com conta.</p> : !url ? (
        <button className="btn ghost" disabled={state === 'busy'} onClick={() => void make()}>{state === 'busy' ? 'Gerando…' : 'Mostrar o endereço para o OBS'}</button>
      ) : (
        <div className="radar__links">
          <div className="radar__url"><input className="field" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Endereço do overlay" /><button className="btn quiet sm" onClick={() => void navigator.clipboard?.writeText(url)}>Copiar</button></div>
          <p className="faint">No OBS: Fontes → + → Navegador → cole o endereço. Tamanho sugerido: 900 × 220. Quem tiver este endereço vê o jogo e o último momento, então não mostre na tela. Vazou? <button className="linklike" onClick={() => void make(true)}>Gerar um endereço novo</button> (o antigo para de funcionar).</p>
        </div>
      )}
      {state === 'error' && <p className="awards__error">Não consegui gerar agora. Tente de novo.</p>}
    </section>
  );
}

/** Comunidade: aparecer em "Novos por aqui", o jogo ao lado do nome e quais avisos receber. */
function CommunitySettings() {
  const stored = useStore((s) => s.prefs.comunidade);
  const cp = stored ?? {};
  // Os avisos são contados no servidor a partir destas escolhas: depois de gravar, recontamos.
  const set = (patch: Partial<CommunityPrefs>) => { actions.setPrefs({ comunidade: { ...cp, ...patch } }); setTimeout(() => void refreshNews(), 1200); };
  const row = (k: keyof CommunityPrefs, def: boolean, title: string, hint: string) => (
    <label className="motion motion--switch" data-on={cp[k] ?? def} key={k}>
      <input type="checkbox" role="switch" className="switch" checked={cp[k] ?? def} onChange={(e) => set({ [k]: e.target.checked })} />
      <span><strong>{title}</strong><span className="muted">{hint}</span></span>
    </label>
  );
  return (
    <section aria-labelledby="comunidade" className="prefs__section">
      <h2 id="comunidade" className="t">Comunidade</h2>
      {row('novos', false, 'Aparecer em “Novos por aqui”', 'Nas suas primeiras semanas, a Praça mostra você e a sua conversa mais recente para quem quiser dar boas-vindas. Começa desligado.')}
      {row('jogo', false, 'Mostrar o jogo da conversa ao lado do meu nome', 'Numa conversa sobre um jogo que está na sua Jornada, aparece “jogando” ou “zerou” perto do seu @. Começa desligado.')}
      {row('eco', true, 'Meus registros como eco para amigos', 'Quem é seu amigo e joga o mesmo jogo vê, na linha do tempo, quando você começou, os momentos das Jornadas que você mostra no perfil e quando zerou. Só até o ponto onde a pessoa está, sem spoiler. Recados, pontos para voltar e cartas nunca aparecem.')}
    </section>
  );
}

/** Quais avisos aparecem no sino e em /avisos. Os da moderação e do site sempre aparecem. */
function NotifSettings() {
  const stored = useStore((s) => s.prefs.comunidade);
  const cp = stored ?? {};
  const set = (patch: Partial<CommunityPrefs>) => { actions.setPrefs({ comunidade: { ...cp, ...patch } }); setTimeout(() => void refreshNotifs(), 1200); };
  const row = (k: keyof CommunityPrefs, title: string, hint: string) => (
    <label className="motion motion--switch" data-on={cp[k] ?? true} key={k}>
      <input type="checkbox" role="switch" className="switch" checked={cp[k] ?? true} onChange={(e) => set({ [k]: e.target.checked })} />
      <span><strong>{title}</strong><span className="muted">{hint}</span></span>
    </label>
  );
  return (
    <section aria-labelledby="avisos" className="prefs__section">
      <h2 id="avisos" className="t">Avisos</h2>
      <p className="muted prefs__p">Aparecem no sino do topo e em <Link to="/avisos">Avisos</Link>, só dentro do site. Os da moderação e os recados do WinnerZ sempre aparecem.</p>
      <h3 className="prefs__sub">Conversas</h3>
      {row('aviso_respostas', 'Respostas para você', 'Quando alguém responde a uma postagem ou resposta sua.')}
      {row('aviso_mencoes', 'Menções', 'Quando alguém escreve o seu @, na Praça, nas comunidades, nos clubes e nas jogatinas.')}
      {row('aviso_acompanhando', 'Conversas que você acompanha', 'Respostas novas nas conversas em que você respondeu ou tocou em “Acompanhar”.')}
      {row('aviso_reacoes', 'Reações', 'GG, Curti e as outras reações nas suas mensagens, juntas num aviso só.')}
      <h3 className="prefs__sub">Jogatinas e clubes</h3>
      {row('aviso_convites', 'Convites', 'Quando alguém convida você para uma jogatina ou um clube.')}
      {row('aviso_lembretes', 'Lembretes de jogatina', 'Uma hora antes da jogatina em que você disse Vou ou Talvez, e quando ela muda de hora ou é cancelada.')}
      {row('aviso_clubes', 'Clubes e jogatinas', 'Respostas às suas mensagens, jogatina nova na agenda do clube, jogo novo do clube e parte que abriu.')}
      <h3 className="prefs__sub">Amigos e Jornada</h3>
      {row('aviso_seguidores', 'Quem começou a seguir você', 'E quando alguém segue você de volta e vocês viram amigos.')}
      {row('aviso_lancamentos', 'Lançamentos', 'Quando sai um jogo que está na sua lista de desejos ou no Radar.')}
      {row('aviso_retomada', 'Voltar a um jogo', 'Quando faz 14 dias que você não volta a um jogo que está jogando, com o link para ver onde parou.')}
    </section>
  );
}
