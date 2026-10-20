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
import { liveApi, NOME_INSCRICAO, TIPOS_ALERTA, type LiveEstado, type LivePrefs, type TipoAlerta } from '../data/liveApi';
import { enderecosCenas } from './OverlayLive';

const AVISO_TWITCH: Record<string, string> = {
  ok: 'Canal ligado. Veja abaixo se cada tipo de alerta ficou ligado.',
  erro: 'A Twitch não deixou ligar tudo. Veja abaixo o que ficou de fora e tente de novo.',
  cancelado: 'A ligação com a Twitch foi cancelada.',
};

export function StudioLivePage() {
  const s = useStore((x) => x);
  const admin = !!s.isAdmin;
  const [estado, setEstado] = useState<LiveEstado | null>(null);
  const [base, setBase] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(() => { try { return AVISO_TWITCH[new URLSearchParams(location.search).get('twitch') ?? ''] ?? ''; } catch { return ''; } });
  const [copiado, setCopiado] = useState('');
  const [testado, setTestado] = useState('');

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
  const testar = async (tipo: TipoAlerta) => {
    setBusy(`t-${tipo}`);
    try { await liveApi.teste(tipo); setTestado(tipo); setTimeout(() => setTestado(''), 2500); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'O teste não foi agora.'); }
    finally { setBusy(''); }
  };
  const religar = async () => { setBusy('canal'); try { await liveApi.ligarCanal(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu para abrir a Twitch.'); setBusy(''); } };
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
        <p className="muted sofa__lead">As cenas do OBS, os alertas da Twitch e os textos que aparecem na live.</p>
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
            <p className="muted">Os alertas precisam do canal autorizado de novo uma vez (a Twitch pede permissão para seguidores, inscrições e bits). Entre na Twitch com a conta do canal.</p>
            <div className="live-central__acoes">
              <button className="btn primary" disabled={!!busy} onClick={() => void religar()}>{busy === 'canal' ? 'Abrindo a Twitch…' : estado.canal ? 'Autorizar o canal de novo' : 'Ligar o canal da Twitch'}</button>
              {estado.canal && <button className="btn ghost" disabled={!!busy} onClick={() => void reinscrever()}>{busy === 'subs' ? 'Refazendo…' : 'Refazer as inscrições'}</button>}
            </div>
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
