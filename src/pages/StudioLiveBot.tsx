/**
 * Central da live · o bot do IAmiguinho no chat (etapa 3b): comandos, avisos automáticos, moderação e pontos.
 * Tudo fica no banco (live_bot_admin, só a administração); o servidor lê de lá a cada mensagem do chat.
 */
import { useEffect, useState } from 'react';
import { liveApi, type AcaoBot, type AvisoBot, type BotConfig, type BotDados, type Comando } from '../data/liveApi';

const VARIAVEIS: [string, string][] = [
  ['{usuario}', 'quem digitou'], ['{pontos}', 'os pontos de quem digitou'], ['{nome_pontos}', 'o nome dos pontos'],
  ['{alvo}', 'o nome depois do comando (!so @fulano)'], ['{tempo}', 'há quanto tempo a live está no ar'],
  ['{discord}', 'o Discord dos textos das cenas'], ['{youtube}', 'o @ do YouTube'], ['{twitch}', 'o @ da Twitch'],
];
const CASA: [string, string][] = [['!comandos', 'lista os comandos'], ['!pontos', 'mostra os pontos de quem digitou'], ['!top', 'os 5 com mais pontos'], ['!morte', 'soma uma morte (moderadores)']];

function Chave({ ligado, onChange, titulo, dica }: { ligado: boolean; onChange: (v: boolean) => void; titulo: string; dica?: string }) {
  return (
    <label className="motion motion--switch" data-on={ligado}>
      <input type="checkbox" role="switch" className="switch" checked={ligado} onChange={(e) => onChange(e.target.checked)} />
      <span><strong>{titulo}</strong>{dica && <span className="muted">{dica}</span>}</span>
    </label>
  );
}

export function PainelBot({ onMsg, login }: { onMsg: (m: string) => void; login: string | null }) {
  const [d, setD] = useState<BotDados | null | undefined>(undefined);
  const [busy, setBusy] = useState('');
  const [cfg, setCfg] = useState<BotConfig | null>(null);
  useEffect(() => {
    void liveApi.bot().then((x) => { setD(x); if (x) setCfg(x.config); }).catch((e) => { onMsg(e instanceof Error ? e.message : 'Não deu para ler o bot.'); setD(null); });
  }, [onMsg]);
  const fazer = async (acao: AcaoBot, a: Record<string, unknown>, rotulo: string = acao): Promise<boolean> => {
    setBusy(rotulo);
    try { const x = await liveApi.botAcao(acao, a); setD(x); setCfg(x.config); return true; }
    catch (e) { onMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); return false; }
    finally { setBusy(''); }
  };
  const mudar = (p: Partial<BotConfig>) => setCfg((c) => (c ? { ...c, ...p } : c));
  const salvarCfg = (chaves: (keyof BotConfig)[], rotulo: string) => {
    if (!cfg) return;
    void fazer('config', Object.fromEntries(chaves.map((k) => [k, cfg[k]])), rotulo);
  };

  // Comando sendo escrito (novo ou editando um).
  const [cmd, setCmd] = useState<{ nome: string; resposta: string; soMod: boolean; antigo?: string } | null>(null);
  const [aviso, setAviso] = useState<Partial<AvisoBot> | null>(null);
  const [zerar, setZerar] = useState(false);

  if (d === undefined) return <p className="muted">Lendo…</p>;
  if (d === null || !cfg) return <p className="muted">Falta rodar a migração 0085 no Supabase.</p>;

  const salvarCmd = async () => { if (cmd && (await fazer('comando-salvar', cmd, 'cmd'))) setCmd(null); };
  const salvarAviso = async () => { if (aviso && (await fazer('aviso-salvar', aviso, 'aviso'))) setAviso(null); };
  const alternarCmd = (c: Comando) => void fazer('comando-salvar', { nome: c.nome, resposta: c.resposta, soMod: c.soMod, ativo: !c.ativo }, `on-${c.nome}`);
  const alternarAviso = (a: AvisoBot) => void fazer('aviso-salvar', { ...a, ativo: !a.ativo }, `on-${a.id}`);

  return (
    <div className="lw">
      <div className="lw__cab">
        <p className="muted lw__intro">O IAmiguinho responde no chat da Twitch com a conta dele. No YouTube ele só conta (votos, sorteio, pontos): responder lá gastaria a cota do Google.</p>
        <Chave ligado={cfg.ligado} onChange={(v) => { mudar({ ligado: v }); void fazer('config', { ligado: v }, 'ligado'); }} titulo="Bot ligado" dica="Desligado, ele não responde, não avisa e não modera; votos e pontos continuam." />
      </div>
      {cfg.status && <p className="live-central__msg" role="status">{cfg.status}</p>}
      <p className="faint">Para moderar e dar pontos por assistir, o IAmiguinho precisa ser moderador do canal: no seu chat da Twitch, digite <code>/mod {login ?? 'nome_da_conta_dele'}</code>.</p>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Comandos</h3>{!cmd && <button className="btn ghost sm" onClick={() => setCmd({ nome: '!', resposta: '', soMod: false })}>+ Novo comando</button>}</div>
        {cmd && (
          <div className="lb__form">
            <label className="glr-f"><span className="glr-f__l">Comando</span><input className="field lb__mono" value={cmd.nome} maxLength={25} placeholder="!jogo" onChange={(e) => setCmd({ ...cmd, nome: e.target.value })} /></label>
            <label className="glr-f lb__largo"><span className="glr-f__l">Resposta</span><textarea className="field" rows={2} value={cmd.resposta} maxLength={400} placeholder="Hoje é dia de Elden Ring, {usuario}." onChange={(e) => setCmd({ ...cmd, resposta: e.target.value })} /></label>
            <Chave ligado={cmd.soMod} onChange={(v) => setCmd({ ...cmd, soMod: v })} titulo="Só moderadores" />
            <div className="live-central__acoes">
              <button className="btn primary sm" disabled={!!busy} onClick={() => void salvarCmd()}>{busy === 'cmd' ? 'Salvando…' : 'Salvar o comando'}</button>
              <button className="btn quiet sm" onClick={() => setCmd(null)}>Cancelar</button>
            </div>
            <details className="lb__vars"><summary>O que dá para usar na resposta</summary><ul>{VARIAVEIS.map(([k, v]) => <li key={k}><code>{k}</code> {v}</li>)}</ul></details>
          </div>
        )}
        <ul className="lb__lista">
          {d.comandos.map((c) => (
            <li key={c.nome} className={c.ativo ? '' : 'is-off'}>
              <span className="lb__nome">{c.nome}{c.soMod && <span className="lb__selo">moderadores</span>}</span>
              <span className="lb__txt">{c.resposta}</span>
              <span className="lb__acoes">
                <span className="faint">{c.usos} {c.usos === 1 ? 'uso' : 'usos'}</span>
                <button className="btn quiet sm" disabled={!!busy} onClick={() => alternarCmd(c)}>{c.ativo ? 'Pausar' : 'Ligar'}</button>
                <button className="btn quiet sm" onClick={() => setCmd({ nome: c.nome, resposta: c.resposta, soMod: c.soMod, antigo: c.nome })}>Editar</button>
                <button className="btn quiet sm" disabled={!!busy} onClick={() => void fazer('comando-apagar', { nome: c.nome }, `del-${c.nome}`)}>Apagar</button>
              </span>
            </li>
          ))}
        </ul>
        <p className="faint">Da casa: {CASA.map(([k, v], i) => <span key={k}>{i > 0 && ' · '}<code>{k}</code> {v}</span>)}.</p>
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Avisos automáticos</h3>{!aviso && d.avisos.length < 10 && <button className="btn ghost sm" onClick={() => setAviso({ texto: '', aCadaMin: 20, minMsgs: 10, ativo: true })}>+ Novo aviso</button>}</div>
        <p className="faint">O IAmiguinho manda o aviso de tempos em tempos, só se o chat estiver conversando (não fala sozinho numa sala vazia).</p>
        {aviso && (
          <div className="lb__form">
            <label className="glr-f lb__largo"><span className="glr-f__l">Texto</span><textarea className="field" rows={2} value={aviso.texto ?? ''} maxLength={400} placeholder="Segue o canal pra não perder a próxima!" onChange={(e) => setAviso({ ...aviso, texto: e.target.value })} /></label>
            <label className="glr-f"><span className="glr-f__l">A cada</span><select className="field" value={aviso.aCadaMin ?? 20} onChange={(e) => setAviso({ ...aviso, aCadaMin: Number(e.target.value) })}>{[5, 10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutos</option>)}</select></label>
            <label className="glr-f"><span className="glr-f__l">Se o chat mandou pelo menos</span><select className="field" value={aviso.minMsgs ?? 10} onChange={(e) => setAviso({ ...aviso, minMsgs: Number(e.target.value) })}>{[0, 5, 10, 15, 25, 50].map((m) => <option key={m} value={m}>{m === 0 ? 'qualquer coisa' : `${m} mensagens`}</option>)}</select></label>
            <div className="live-central__acoes">
              <button className="btn primary sm" disabled={!!busy} onClick={() => void salvarAviso()}>{busy === 'aviso' ? 'Salvando…' : 'Salvar o aviso'}</button>
              <button className="btn quiet sm" onClick={() => setAviso(null)}>Cancelar</button>
            </div>
          </div>
        )}
        <ul className="lb__lista">
          {d.avisos.map((a) => (
            <li key={a.id} className={a.ativo ? '' : 'is-off'}>
              <span className="lb__nome lb__nome--aviso">a cada {a.aCadaMin} min</span>
              <span className="lb__txt">{a.texto}</span>
              <span className="lb__acoes">
                <button className="btn quiet sm" disabled={!!busy} onClick={() => alternarAviso(a)}>{a.ativo ? 'Pausar' : 'Ligar'}</button>
                <button className="btn quiet sm" onClick={() => setAviso(a)}>Editar</button>
                <button className="btn quiet sm" disabled={!!busy} onClick={() => void fazer('aviso-apagar', { id: a.id }, `del-${a.id}`)}>Apagar</button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Moderação</h3></div>
        <p className="faint">Vale só no chat da Twitch. Moderadores, VIPs e você nunca são moderados.</p>
        <Chave ligado={cfg.mod_links} onChange={(v) => mudar({ mod_links: v })} titulo="Bloquear links" dica="Menos os endereços liberados abaixo." />
        {cfg.mod_links && <label className="glr-f"><span className="glr-f__l">Endereços liberados (separados por espaço)</span><input className="field" value={cfg.mod_links_ok} maxLength={500} onChange={(e) => mudar({ mod_links_ok: e.target.value })} /></label>}
        <Chave ligado={cfg.mod_caps} onChange={(v) => mudar({ mod_caps: v })} titulo="Bloquear mensagem gritada" dica="Mensagem longa quase toda em CAPS LOCK." />
        <label className="glr-f"><span className="glr-f__l">Palavras proibidas (separadas por vírgula)</span><textarea className="field" rows={2} value={cfg.mod_palavras} maxLength={2000} placeholder="Deixe vazio para não bloquear nenhuma" onChange={(e) => mudar({ mod_palavras: e.target.value })} /></label>
        <div className="lw__opcoes">
          <label className="glr-f"><span className="glr-f__l">O que fazer</span>
            <select className="field" value={cfg.mod_acao} onChange={(e) => mudar({ mod_acao: e.target.value as BotConfig['mod_acao'] })}><option value="apagar">Apagar a mensagem e avisar</option><option value="castigo">Castigo (não fala por um tempo) e avisar</option></select>
          </label>
          {cfg.mod_acao === 'castigo' && <label className="glr-f"><span className="glr-f__l">Tempo do castigo</span><select className="field" value={cfg.mod_segundos} onChange={(e) => mudar({ mod_segundos: Number(e.target.value) })}>{[30, 60, 300, 600].map((x) => <option key={x} value={x}>{x < 60 ? `${x} segundos` : `${x / 60} ${x === 60 ? 'minuto' : 'minutos'}`}</option>)}</select></label>}
        </div>
        <Chave ligado={cfg.mod_isentos_subs} onChange={(v) => mudar({ mod_isentos_subs: v })} titulo="Inscritos do canal ficam de fora" />
        <button className="btn primary sm lb__salvar" disabled={!!busy} onClick={() => salvarCfg(['mod_links', 'mod_links_ok', 'mod_caps', 'mod_palavras', 'mod_acao', 'mod_segundos', 'mod_isentos_subs'], 'mod')}>{busy === 'mod' ? 'Salvando…' : 'Salvar a moderação'}</button>
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Pontos</h3></div>
        <p className="faint">Quem conversa ganha pontos (no máximo uma vez por minuto) e, a cada 5 minutos, quem está no chat da Twitch ganha por assistir. No chat: <code>!pontos</code> e <code>!top</code>.</p>
        <div className="lw__opcoes lb__pontos">
          <label className="glr-f"><span className="glr-f__l">Nome dos pontos</span><input className="field" value={cfg.pontos_nome} maxLength={20} onChange={(e) => mudar({ pontos_nome: e.target.value })} /></label>
          <label className="glr-f"><span className="glr-f__l">Por mensagem</span><input className="field" type="number" min={0} max={1000} value={cfg.pontos_msg} onChange={(e) => mudar({ pontos_msg: Math.max(0, Number(e.target.value) || 0) })} /></label>
          <label className="glr-f"><span className="glr-f__l">Por assistir (a cada 5 min)</span><input className="field" type="number" min={0} max={1000} value={cfg.pontos_assistir} onChange={(e) => mudar({ pontos_assistir: Math.max(0, Number(e.target.value) || 0) })} /></label>
        </div>
        <button className="btn primary sm lb__salvar" disabled={!!busy} onClick={() => salvarCfg(['pontos_nome', 'pontos_msg', 'pontos_assistir'], 'pts')}>{busy === 'pts' ? 'Salvando…' : 'Salvar os pontos'}</button>
        {d.top.length > 0 ? (
          <ol className="lb__top">{d.top.map((x, i) => <li key={`${x.pl}-${x.nome}-${i}`}><span className={`lv-chat__pl is-${x.pl}`}>{x.pl === 'yt' ? 'YT' : 'TW'}</span><span>{x.nome}</span><b>{x.pontos.toLocaleString('pt-BR')}</b></li>)}</ol>
        ) : <p className="muted">Ninguém tem {cfg.pontos_nome} ainda.</p>}
        <div className="live-central__acoes">
          <span className="faint">{d.pessoas} {d.pessoas === 1 ? 'pessoa' : 'pessoas'} com {cfg.pontos_nome}.</span>
          {d.pessoas > 0 && <button className="btn quiet sm" disabled={!!busy} onClick={() => { if (!zerar) { setZerar(true); setTimeout(() => setZerar(false), 4000); return; } setZerar(false); void fazer('pontos-zerar', {}, 'zerar'); }}>{zerar ? 'Confirmar: zerar todos' : 'Zerar todos os pontos'}</button>}
        </div>
      </div>
    </div>
  );
}
