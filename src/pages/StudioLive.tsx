/**
 * Studio · Central da live (sistema de live, etapa 1). Só da administração.
 * Os endereços das cenas para o OBS, a ligação com a Twitch (os alertas precisam do canal autorizado com os escopos de
 * seguidores, inscrições e bits), os botões para testar cada alerta e os textos que as cenas mostram (salvos nas
 * preferências da conta do canal; o overlay lê de lá).
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore } from '../data/store';
import { Icon } from '../components/Icon';
import { liveApi, NOME_INSCRICAO, TIPOS_ALERTA, type LiveEstado, type LivePrefs, type TesteAlerta, type TipoAlerta, type VoltaYoutube } from '../data/liveApi';
import { enderecosCenas } from './OverlayLive';
import { somDoAlerta } from '../lib/sonsLive';
import { PainelWidgets } from './StudioLiveWidgets';

/** Como soa cada alerta (para aprender de ouvido). */
const SONS: { tipo: TipoAlerta; nome: string; som: string }[] = [
  { tipo: 'follow', nome: 'Seguidor', som: 'campainha: din-don' },
  { tipo: 'sub', nome: 'Inscrição', som: 'moeda de videogame' },
  { tipo: 'resub', nome: 'Renovação', som: 'duas moedas e um brilho' },
  { tipo: 'gift', nome: 'Presente', som: 'chuva de brilhos subindo' },
  { tipo: 'cheer', nome: 'Bits', som: 'laser: três piu' },
  { tipo: 'raid', nome: 'Raid', som: 'tambor e fanfarra' },
];
const AVISO_YOUTUBE: Record<string, string> = {
  ok: 'Canal do YouTube ligado. Durante a live, ligue "Ler o YouTube" aqui embaixo.',
  erro: 'O Google não deixou ligar o canal agora. Tente de novo.',
  cancelado: 'A ligação com o YouTube foi cancelada.',
  semcanal: 'Essa conta do Google não tem canal no YouTube. Entre com a conta do canal.',
  migracao: 'Falta rodar a migração 0083 no Supabase.',
};
/** Um relógio que não dorme quando a aba fica em segundo plano (o do navegador fica lento depois de uns minutos). */
function relogio(): { esperar: (ms: number) => Promise<void>; fechar: () => void } {
  try {
    const w = new Worker(URL.createObjectURL(new Blob(['onmessage=(e)=>setTimeout(()=>postMessage(0),e.data)'], { type: 'text/javascript' })));
    let pronto: (() => void) | null = null;
    w.onmessage = () => { pronto?.(); pronto = null; };
    return { esperar: (ms) => new Promise<void>((ok) => { pronto = ok; w.postMessage(ms); }), fechar: () => w.terminate() };
  } catch { return { esperar: (ms) => new Promise((ok) => setTimeout(ok, ms)), fechar: () => {} }; }
}
const AVISO_TWITCH: Record<string, string> = {
  ok: 'Canal ligado. Veja abaixo se cada tipo de alerta ficou ligado.',
  erro: 'A Twitch não deixou ligar tudo. Veja abaixo o que ficou de fora e tente de novo.',
  cancelado: 'A ligação com a Twitch foi cancelada.',
  'bot-ok': 'Conta do IAmiguinho ligada. Veja abaixo se o "Chat" ficou ligado.',
  'bot-erro': 'A Twitch não deixou ligar a conta do IAmiguinho agora. Tente de novo.',
  'bot-cancelado': 'A ligação da conta do IAmiguinho foi cancelada.',
  'bot-migracao': 'Falta rodar a migração 0084 no Supabase.',
};

export function StudioLivePage() {
  const s = useStore((x) => x);
  const admin = !!s.isAdmin;
  const [estado, setEstado] = useState<LiveEstado | null>(null);
  const [base, setBase] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(() => { try { const q = new URLSearchParams(location.search); return AVISO_TWITCH[q.get('twitch') ?? ''] ?? AVISO_YOUTUBE[q.get('youtube') ?? ''] ?? ''; } catch { return ''; } });
  // O leitor do YouTube: enquanto ligado, pede uma volta ao servidor e espera o tempo que ele disser.
  const [lerYt, setLerYt] = useState(false);
  const [intervalo, setIntervalo] = useState<number>(() => { try { return Number(localStorage.getItem('wz.live.ytIntervalo')) || 12; } catch { return 12; } });
  const [volta, setVolta] = useState<(VoltaYoutube & { em: number; total: number; alertasTotal: number }) | null>(null);
  useEffect(() => {
    if (!lerYt) return;
    let vivo = true, total = 0, alertasTotal = 0;
    const r = relogio();
    (async () => {
      while (vivo) {
        let espera = intervalo * 1000;
        try {
          const v = await liveApi.youtubePuxar(intervalo);
          total += v.mensagens ?? 0; alertasTotal += v.alertas ?? 0;
          if (vivo) setVolta({ ...v, em: Date.now(), total, alertasTotal });
          espera = Math.max(intervalo * 1000, v.esperarMs);
        } catch (e) { if (vivo) setVolta({ ativa: false, esperarMs: 30000, status: e instanceof Error ? e.message : 'O servidor não respondeu.', em: Date.now(), total, alertasTotal }); espera = 30000; }
        await r.esperar(espera);
      }
    })();
    return () => { vivo = false; r.fechar(); };
  }, [lerYt, intervalo]);
  useEffect(() => { try { localStorage.setItem('wz.live.ytIntervalo', String(intervalo)); } catch { /* nada */ } }, [intervalo]);
  const [copiado, setCopiado] = useState('');
  const [testado, setTestado] = useState('');
  const somCtx = useRef<AudioContext | null>(null);

  // Os textos das cenas: edição local e gravação nas preferências um instante depois de parar de digitar.
  const [live, setLive] = useState<LivePrefs>(() => s.prefs.live ?? {});
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mudar = (p: Partial<LivePrefs>) => {
    setLive((l) => {
      const n = { ...l, ...p };
      clearTimeout(t.current);
      t.current = setTimeout(() => actions.setPrefs({ live: n }), 600);
      return n;
    });
  };
  useEffect(() => () => clearTimeout(t.current), []);

  const carregar = async () => { try { setEstado(await liveApi.estado()); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu para ler o estado agora.'); } };
  useEffect(() => { if (admin) void carregar(); }, [admin]);

  if (!admin) return (
    <main className="page pad narrow">
      <h1 className="t big">Central da live</h1>
      <p className="muted lead">Esta tela é só da administração do WinnerZ.</p>
    </main>
  );

  const mostrarEnderecos = async (rotate = false) => {
    setBusy('end');
    try {
      const u = await liveApi.endereco(rotate);
      const nonce = u.split('/overlay/')[1]?.split('.')[1];
      if (nonce) actions.setPrefs({ overlayNonce: nonce }); // guarda o segredo, para a próxima mudança de preferência não apagá-lo
      setBase(u);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu para gerar os endereços.'); }
    finally { setBusy(''); }
  };
  const copiar = (id: string, url: string) => { void navigator.clipboard?.writeText(url).then(() => { setCopiado(id); setTimeout(() => setCopiado(''), 1800); }).catch(() => null); };
  const testar = async (tipo: TesteAlerta) => {
    setBusy(`t-${tipo}`);
    try { await liveApi.teste(tipo); setTestado(tipo); setTimeout(() => setTestado(''), 2500); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'O teste não foi agora.'); }
    finally { setBusy(''); }
  };
  const ouvir = (tipo: TipoAlerta) => { try { somCtx.current ??= new AudioContext(); void somCtx.current.resume(); somDoAlerta(somCtx.current, tipo); } catch { /* sem som */ } };
  const ligarYt = async () => { setBusy('yt'); try { await liveApi.youtubeLigar(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu para abrir o Google.'); setBusy(''); } };
  const desligarYt = async () => { setBusy('ytd'); setLerYt(false); try { await liveApi.youtubeDesligar(); await carregar(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(''); } };
  const religar = async () => { setBusy('canal'); try { await liveApi.ligarCanal(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu para abrir a Twitch.'); setBusy(''); } };
  const ligarBot = async () => { setBusy('bot'); try { await liveApi.ligarBot(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu para abrir a Twitch.'); setBusy(''); } };
  const desligarBot = async () => { setBusy('botd'); try { setMsg(`Conta do IAmiguinho desligada. Inscrições: ${await liveApi.desligarBot()}.`); await carregar(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(''); } };
  const reinscrever = async () => { setBusy('subs'); try { setMsg(`Inscrições: ${await liveApi.reinscrever()}.`); await carregar(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(''); } };
  const contagem = (min: number | null) => mudar({ comecaEm: min == null ? null : new Date(Date.now() + min * 60_000).toISOString() });

  const subs = estado?.subs ?? [];
  const faltando = subs.filter((x) => !/^(enabled|webhook_callback_verification_pending|pendente)/.test(x.status));
  const cenas = enderecosCenas(base);

  return (
    <main className="page pad live-central">
      <header className="live-central__head">
        <Link to="/studio" className="sofa__back"><Icon name="voltar" size={16} />Studio</Link>
        <h1 className="t sofa__title">Central da live</h1>
        <p className="muted sofa__lead">As cenas do OBS, os alertas, os widgets da tela e os textos que aparecem na live.</p>
      </header>
      {msg && <p className="live-central__msg" role="status">{msg}</p>}

      <section className="live-central__bloco" aria-labelledby="lc-twitch">
        <h2 id="lc-twitch" className="t live-central__h">Twitch</h2>
        {!estado ? <p className="muted">Lendo…</p> : (
          <>
            <p className={`live-central__estado${estado.canal && !faltando.length && subs.length ? ' is-ok' : ''}`}>
              <i aria-hidden="true" />
              {!estado.twitch ? 'A Twitch ainda não foi ligada no servidor (TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET).'
                : !estado.canal ? 'O canal ainda não autorizou o WinnerZ.'
                : `Canal ${estado.canal}${estado.status ? ` · ${estado.status}` : ''}`}
            </p>
            {subs.length > 0 && (
              <ul className="live-central__subs">
                {subs.map((x) => (
                  <li key={x.tipo} className={/^(enabled|webhook_callback_verification_pending|pendente)/.test(x.status) ? '' : 'is-erro'}>
                    <span>{NOME_INSCRICAO[x.tipo] ?? x.tipo}</span>
                    <span className="muted">{/^enabled/.test(x.status) ? 'ligado' : /verification_pending|pendente/.test(x.status) ? 'esperando a Twitch confirmar' : /verification_failed/.test(x.status) ? 'a Twitch não conseguiu confirmar com o site' : x.status}</span>
                  </li>
                ))}
              </ul>
            )}
            {estado.callback && <p className="faint">A Twitch avisa em: <code>{estado.callback}</code></p>}
            <p className="muted">{estado.bot?.login && !estado.bot.canalPermite ? 'Falta o canal dar a permissão de bot (para o IAmiguinho ler o chat): aperte "Autorizar o canal de novo" e entre na Twitch com a conta do canal.' : 'Para autorizar de novo, entre na Twitch com a conta do canal. A Twitch pede permissão para seguidores, inscrições, bits e o bot do IAmiguinho no chat.'}</p>
            <div className="live-central__acoes">
              <button className="btn primary" disabled={!!busy} onClick={() => void religar()}>{busy === 'canal' ? 'Abrindo a Twitch…' : estado.canal ? 'Autorizar o canal de novo' : 'Ligar o canal da Twitch'}</button>
              {estado.canal && <button className="btn ghost" disabled={!!busy} onClick={() => void reinscrever()}>{busy === 'subs' ? 'Refazendo…' : 'Refazer as inscrições'}</button>}
            </div>
            <div className="live-central__motor">
              <span className="glr-f__l">Conta do IAmiguinho (o bot do chat)</span>
              {estado.bot && !estado.bot.migracao ? <p className="muted">Falta rodar a migração 0084 no Supabase.</p> : (
                <>
                  <p className={`live-central__estado${estado.bot?.login && estado.bot.canalPermite ? ' is-ok' : ''}`}><i aria-hidden="true" />{estado.bot?.login ? `Ligada: @${estado.bot.login}` : 'Ainda não ligada.'}</p>
                  {estado.bot?.mesmaConta && <p className="faint">Essa é a conta do próprio canal. Funciona, mas no chat as mensagens do bot vão aparecer com o seu nome.</p>}
                  <p className="muted">Com ela, a Twitch manda cada mensagem do chat para o site: é assim que a enquete, o sorteio e o <code>!morte</code> funcionam, mesmo sem nenhuma página aberta. Na tela da Twitch, se aparecer a conta do canal, clique em "Não é você?" e entre com a conta do IAmiguinho.</p>
                  <div className="live-central__acoes">
                    <button className="btn primary" disabled={!!busy || !estado.canal} onClick={() => void ligarBot()}>{busy === 'bot' ? 'Abrindo a Twitch…' : estado.bot?.login ? 'Trocar a conta' : 'Ligar a conta do IAmiguinho'}</button>
                    {estado.bot?.login && <button className="btn quiet" disabled={!!busy} onClick={() => void desligarBot()}>Desligar</button>}
                  </div>
                  {!estado.canal && <p className="faint">Primeiro ligue o canal da Twitch.</p>}
                </>
              )}
            </div>
          </>
        )}
      </section>

      <section className="live-central__bloco" aria-labelledby="lc-widgets">
        <h2 id="lc-widgets" className="t live-central__h">Widgets na tela</h2>
        <PainelWidgets onMsg={setMsg} />
      </section>

      <section className="live-central__bloco" aria-labelledby="lc-yt">
        <h2 id="lc-yt" className="t live-central__h">YouTube</h2>
        {!estado ? <p className="muted">Lendo…</p> : !estado.youtube?.servidor ? (
          <p className="muted">O YouTube ainda não foi ligado no servidor: faltam as variáveis YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET na Vercel.</p>
        ) : !estado.youtube.migracao ? (
          <p className="muted">Falta rodar a migração 0083 no Supabase.</p>
        ) : (
          <>
            <p className={`live-central__estado${estado.youtube.ligado ? ' is-ok' : ''}`}><i aria-hidden="true" />{estado.youtube.ligado ? `Canal ${estado.youtube.canal ?? ''}${estado.youtube.status ? ` · ${estado.youtube.status}` : ''}` : 'O canal do YouTube ainda não autorizou o WinnerZ.'}</p>
            <div className="live-central__acoes">
              <button className="btn primary" disabled={!!busy} onClick={() => void ligarYt()}>{busy === 'yt' ? 'Abrindo o Google…' : estado.youtube.ligado ? 'Autorizar o canal de novo' : 'Ligar o canal do YouTube'}</button>
              {estado.youtube.ligado && <button className="btn quiet" disabled={!!busy} onClick={() => void desligarYt()}>Desligar</button>}
            </div>
            {estado.youtube.ligado && (
              <div className="live-central__motor">
                <label className="motion motion--switch" data-on={lerYt}>
                  <input type="checkbox" role="switch" className="switch" checked={lerYt} onChange={(e) => setLerYt(e.target.checked)} />
                  <span><strong>Ler o YouTube</strong><span className="muted">Ligue quando a live começar e deixe esta página aberta (pode ficar em outra aba). O YouTube não avisa o site sozinho: esta página pergunta de tempos em tempos.</span></span>
                </label>
                <label className="glr-f"><span className="glr-f__l">Perguntar a cada</span>
                  <select className="field" value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>{[10, 12, 15, 20, 30].map((x) => <option key={x} value={x}>{x} segundos (cota para uns {Math.floor(9000 / ((3600 / x) * 5 + 60))} h de live)</option>)}</select>
                </label>
                {volta && <p className="live-central__volta" role="status"><i className={volta.ativa ? 'is-on' : ''} aria-hidden="true" />{volta.status} {volta.total ? `· ${volta.total} mensagens` : ''}{volta.alertasTotal ? ` · ${volta.alertasTotal} alertas` : ''}</p>}
              </div>
            )}
          </>
        )}
      </section>

      <section className="live-central__bloco" aria-labelledby="lc-cenas">
        <h2 id="lc-cenas" className="t live-central__h">Cenas para o OBS</h2>
        <p className="muted">Em cada cena do OBS: Fontes → + → Navegador → cole o endereço, com largura 1920 e altura 1080. Ponha a fonte da câmera por cima, dentro da moldura. Para o som dos alertas entrar na live, marque "Controlar áudio pelo OBS" nas propriedades da fonte (o som aparece no mixer do OBS). Quem tiver estes endereços vê o que a live mostra, então não mostre na tela.</p>
        {!base ? (
          <button className="btn ghost" disabled={busy === 'end'} onClick={() => void mostrarEnderecos()}>{busy === 'end' ? 'Gerando…' : 'Mostrar os endereços'}</button>
        ) : (
          <>
            <ul className="live-central__cenas">
              {cenas.map((c) => (
                <li key={c.id}>
                  <span className="live-central__cena"><b>{c.nome}</b><span className="muted">{c.dica}</span></span>
                  <span className="radar__url"><input className="field" readOnly value={c.url} onFocus={(e) => e.currentTarget.select()} aria-label={`Endereço: ${c.nome}`} /><button className="btn quiet sm" onClick={() => copiar(c.id, c.url)}>{copiado === c.id ? 'Copiado' : 'Copiar'}</button><a className="btn quiet sm" href={c.url} target="_blank" rel="noreferrer">Ver</a></span>
                </li>
              ))}
            </ul>
            <p className="faint">Vazou algum endereço? <button className="linklike" onClick={() => void mostrarEnderecos(true)}>Gerar endereços novos</button> (os antigos param de funcionar em todas as cenas).</p>
          </>
        )}
      </section>

      <section className="live-central__bloco" aria-labelledby="lc-teste">
        <h2 id="lc-teste" className="t live-central__h">Testar os alertas</h2>
        <p className="muted">Com uma cena aberta (no OBS ou no "Ver"), aperte um tipo: o alerta aparece com o IAmiguinho reagindo e o som. No "Ver", o navegador só toca som depois de um clique na página da cena. O teste não conta como evento de verdade.</p>
        <div className="live-central__acoes">
          {TIPOS_ALERTA.map((x) => (
            <button key={x.tipo} className="btn ghost" disabled={!!busy} onClick={() => void testar(x.tipo)}>{testado === x.tipo ? 'Enviado' : x.nome}</button>
          ))}
        </div>
        <span className="glr-f__l">Ouvir só o som (aqui, sem mandar para a live)</span>
        <ul className="live-central__sons">
          {SONS.map((x) => (
            <li key={x.tipo}><button className="btn quiet sm" onClick={() => ouvir(x.tipo)}><Icon name="play" size={14} />{x.nome}</button><span className="muted">{x.som}</span></li>
          ))}
        </ul>
      </section>

      <section className="live-central__bloco" aria-labelledby="lc-textos">
        <h2 id="lc-textos" className="t live-central__h">Textos das cenas</h2>
        <div className="live-central__campos">
          <label className="glr-f"><span className="glr-f__l">Temporada</span><input className="field" value={live.temporada ?? ''} maxLength={20} placeholder="3" onChange={(e) => mudar({ temporada: e.target.value })} /></label>
          <label className="glr-f"><span className="glr-f__l">Seu @ no YouTube</span><input className="field" value={live.youtube ?? ''} maxLength={40} placeholder="@winnerz" onChange={(e) => mudar({ youtube: e.target.value })} /></label>
          <label className="glr-f"><span className="glr-f__l">Seu @ na Twitch</span><input className="field" value={live.twitch ?? ''} maxLength={40} placeholder="twitch.tv/winnerz" onChange={(e) => mudar({ twitch: e.target.value })} /></label>
          <label className="glr-f"><span className="glr-f__l">Discord</span><input className="field" value={live.discord ?? ''} maxLength={60} placeholder="discord.gg/…" onChange={(e) => mudar({ discord: e.target.value })} /></label>
          <label className="glr-f live-central__largo"><span className="glr-f__l">Papo de hoje (cena Conversa)</span><input className="field" value={live.papo ?? ''} maxLength={90} placeholder="O assunto da conversa" onChange={(e) => mudar({ papo: e.target.value })} /></label>
          <label className="glr-f live-central__largo"><span className="glr-f__l">Próxima live (cena Encerrando)</span><input className="field" value={live.proxima ?? ''} maxLength={90} placeholder="Sábado, 20h" onChange={(e) => mudar({ proxima: e.target.value })} /></label>
          <label className="glr-f"><span className="glr-f__l">Pausa do "Já volto"</span>
            <select className="field" value={live.pausaMin ?? 5} onChange={(e) => mudar({ pausaMin: Number(e.target.value) })}>{[2, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>uns {m} minutos</option>)}</select>
          </label>
          <label className="glr-f"><span className="glr-f__l">Câmera na cena Jogando</span>
            <select className="field" value={live.camLado ?? 'direita'} onChange={(e) => mudar({ camLado: e.target.value as 'direita' | 'esquerda' })}><option value="direita">Embaixo, à direita</option><option value="esquerda">Embaixo, à esquerda</option></select>
          </label>
        </div>
        <div className="live-central__contagem">
          <span className="glr-f__l">Contagem do "Começando"</span>
          <div className="live-central__acoes">
            {[3, 5, 10, 15].map((m) => <button key={m} className="btn ghost sm" onClick={() => contagem(m)}>{m} min</button>)}
            <button className="btn quiet sm" onClick={() => contagem(null)}>Tirar a contagem</button>
          </div>
          <span className="muted">{live.comecaEm && Date.parse(live.comecaEm) > Date.now() ? `A live começa às ${new Date(live.comecaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : 'Sem contagem: a cena mostra "Já já".'}</span>
        </div>
      </section>

      <section className="live-central__bloco" aria-labelledby="lc-iam">
        <h2 id="lc-iam" className="t live-central__h">IAmiguinho</h2>
        <p className="muted">O balão das cenas mostra as falas do IAmiguinho no sofá. Nas cenas paradas (Começando, Já volto, Conversa), ele solta uma fala da casa enquanto o sofá estiver quieto.</p>
        <Link to="/studio/sofa" className="btn ghost">Abrir a cabine do sofá</Link>
      </section>
    </main>
  );
}
