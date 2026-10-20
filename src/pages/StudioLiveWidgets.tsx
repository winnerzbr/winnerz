/**
 * Central da live · widgets (etapa 3a): o contador de mortes, as metas, a enquete, o sorteio e os créditos.
 * Tudo muda o painel no banco (live_painel_acao, só a administração); as cenas do OBS leem de lá a cada 2 s.
 */
import { useEffect, useRef, useState } from 'react';
import { liveApi, NOME_META, TITULO_META, type AcaoPainel, type Meta, type Painel, type TipoMeta } from '../data/liveApi';

type MetaEd = Pick<Meta, 'tipo' | 'titulo' | 'alvo' | 'mostrar'> & { id?: string; atual?: number };
const DURACOES = [{ s: 0, t: 'Sem tempo (eu encerro)' }, { s: 30, t: '30 segundos' }, { s: 60, t: '1 minuto' }, { s: 120, t: '2 minutos' }, { s: 300, t: '5 minutos' }];
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function Chave({ ligado, onChange, titulo, dica }: { ligado: boolean; onChange: (v: boolean) => void; titulo: string; dica?: string }) {
  return (
    <label className="motion motion--switch" data-on={ligado}>
      <input type="checkbox" role="switch" className="switch" checked={ligado} onChange={(e) => onChange(e.target.checked)} />
      <span><strong>{titulo}</strong>{dica && <span className="muted">{dica}</span>}</span>
    </label>
  );
}

export function PainelWidgets({ onMsg }: { onMsg: (m: string) => void }) {
  const [p, setP] = useState<Painel | null>(null);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState('');
  const editando = useRef(false);
  // Lê o painel a cada 3 s (para ver os votos e quem entrou no sorteio).
  useEffect(() => {
    let vivo = true;
    const ler = async () => {
      try { const n = await liveApi.painel(); if (vivo) { if (n) { setP(n); setErro(''); } else setErro('Falta rodar a migração 0084 no Supabase.'); } }
      catch { /* tenta de novo */ }
    };
    void ler();
    const t = setInterval(ler, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, []);
  const fazer = async (acao: AcaoPainel, a: Record<string, unknown> = {}, rotulo: string = acao) => {
    setBusy(rotulo);
    try { setP(await liveApi.acao(acao, a)); }
    catch (e) { onMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); }
    finally { setBusy(''); }
  };

  // Mortes: o nome do que está matando grava um instante depois de parar de digitar.
  const [rotulo, setRotulo] = useState<string | null>(null);
  const tRot = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mudarRotulo = (v: string) => { setRotulo(v); clearTimeout(tRot.current); tRot.current = setTimeout(() => void fazer('mortes', { rotulo: v }, 'rotulo'), 700); };
  useEffect(() => () => clearTimeout(tRot.current), []);

  // Metas: edição local, grava no "Salvar".
  const [metas, setMetas] = useState<MetaEd[] | null>(null);
  useEffect(() => { if (p && !editando.current) setMetas(p.metas.map((m) => ({ ...m }))); }, [p]);
  const mudarMeta = (i: number, x: Partial<MetaEd>) => { editando.current = true; setMetas((l) => (l ?? []).map((m, j) => (j === i ? { ...m, ...x } : m))); };
  const salvarMetas = async (extra?: { recomecar?: string }) => {
    const l = (metas ?? []).map((m) => ({ id: m.id, tipo: m.tipo, titulo: m.titulo, alvo: m.alvo, mostrar: m.mostrar, recomecar: !!m.id && m.id === extra?.recomecar }));
    editando.current = false;
    await fazer('metas', { metas: l }, extra?.recomecar ? `rec-${extra.recomecar}` : 'metas');
  };

  // Enquete nova.
  const [pergunta, setPergunta] = useState('');
  const [opcoes, setOpcoes] = useState<string[]>(['', '']);
  const [dur, setDur] = useState(60);
  // Sorteio novo.
  const [palavra, setPalavra] = useState('!sorteio');

  if (erro && !p) return <p className="muted">{erro}</p>;
  if (!p) return <p className="muted">Lendo…</p>;
  const e = p.enquete, s = p.sorteio;
  const totalVotos = e ? e.votos.reduce((a, b) => a + b, 0) : 0;
  const enqueteAberta = !!e?.aberta;

  return (
    <div className="lw">
      <p className="muted">Os widgets aparecem nas cenas Jogando (no canto de cima, à direita), Conversa e Já volto, e na fonte "Só os widgets". O chat da Twitch chega pela conta do IAmiguinho (ligue no bloco da Twitch); o do YouTube, pelo "Ler o YouTube".</p>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Contador de mortes</h3><Chave ligado={p.mostrarMortes} onChange={(v) => void fazer('mortes', { mostrar: v })} titulo="Mostrar na tela" /></div>
        <div className="lw__mortes">
          <button className="btn ghost" disabled={!!busy || p.mortes <= 0} onClick={() => void fazer('mortes', { delta: -1 })} aria-label="Tirar uma morte">−1</button>
          <b className="lw__n" aria-live="polite">{p.mortes.toLocaleString('pt-BR')}</b>
          <button className="btn primary" disabled={!!busy} onClick={() => void fazer('mortes', { delta: 1 })} aria-label="Somar uma morte">+1</button>
          <button className="btn quiet sm" disabled={!!busy || !p.mortes} onClick={() => void fazer('mortes', { valor: 0 })}>Zerar</button>
        </div>
        <label className="glr-f lw__campo"><span className="glr-f__l">O que está matando (opcional)</span><input className="field" value={rotulo ?? p.mortesRotulo ?? ''} maxLength={40} placeholder="Chefe da torre" onChange={(x) => mudarRotulo(x.target.value)} /></label>
        <p className="faint">No chat, moderadores digitam <code>!morte</code> para somar uma e <code>!morte -</code> para tirar uma.</p>
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Metas</h3></div>
        <p className="faint">Contam os alertas de verdade a partir da hora em que a meta é criada (os testes não contam). Até 3 metas.</p>
        {(metas ?? []).map((m, i) => {
          const atual = p.metas.find((x) => x.id === m.id)?.atual ?? 0;
          return (
            <div key={m.id ?? `nova-${i}`} className="lw__meta">
              <label className="glr-f"><span className="glr-f__l">Conta</span>
                <select className="field" value={m.tipo} onChange={(x) => mudarMeta(i, { tipo: x.target.value as TipoMeta })}>{(Object.keys(NOME_META) as TipoMeta[]).map((t) => <option key={t} value={t}>{NOME_META[t]}</option>)}</select>
              </label>
              <label className="glr-f"><span className="glr-f__l">Título na tela</span><input className="field" value={m.titulo} maxLength={40} placeholder={TITULO_META[m.tipo]} onChange={(x) => mudarMeta(i, { titulo: x.target.value })} /></label>
              <label className="glr-f lw__alvo"><span className="glr-f__l">Meta</span><input className="field" type="number" min={1} max={10000000} value={m.alvo} onChange={(x) => mudarMeta(i, { alvo: Math.max(1, Number(x.target.value) || 1) })} /></label>
              <div className="lw__meta-pe">
                {m.id ? <span className="lw__prog"><b>{atual.toLocaleString('pt-BR')}</b> de {m.alvo.toLocaleString('pt-BR')}</span> : <span className="muted">Nova: começa a contar ao salvar</span>}
                <Chave ligado={m.mostrar} onChange={(v) => mudarMeta(i, { mostrar: v })} titulo="Na tela" />
                {m.id && <button className="btn quiet sm" disabled={!!busy} onClick={() => void salvarMetas({ recomecar: m.id })}>{busy === `rec-${m.id}` ? 'Zerando…' : 'Recomeçar do zero'}</button>}
                <button className="btn quiet sm" onClick={() => { editando.current = true; setMetas((l) => (l ?? []).filter((_, j) => j !== i)); }}>Tirar</button>
              </div>
            </div>
          );
        })}
        <div className="live-central__acoes">
          {(metas?.length ?? 0) < 3 && <button className="btn ghost sm" onClick={() => { editando.current = true; setMetas((l) => [...(l ?? []), { tipo: 'seguidores', titulo: '', alvo: 10, mostrar: true }]); }}>+ Nova meta</button>}
          <button className="btn primary sm" disabled={!!busy} onClick={() => void salvarMetas()}>{busy === 'metas' ? 'Salvando…' : 'Salvar as metas'}</button>
        </div>
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Enquete</h3>{e && <Chave ligado={e.mostrar} onChange={(v) => void fazer('enquete-mostrar', { mostrar: v })} titulo="Mostrar na tela" />}</div>
        {e ? (
          <>
            <p className={`live-central__estado${enqueteAberta ? ' is-ok' : ''}`}><i aria-hidden="true" />{enqueteAberta ? `Aberta${e.fechaEm ? ` até ${new Date(e.fechaEm).toLocaleTimeString('pt-BR')}` : ''}` : 'Encerrada'} · {totalVotos} {totalVotos === 1 ? 'voto' : 'votos'}</p>
            {e.pergunta && <b>{e.pergunta}</b>}
            <ol className="lw__votos">
              {e.opcoes.map((o, i) => {
                const v = e.votos[i] ?? 0, pct = totalVotos ? Math.round((v / totalVotos) * 100) : 0;
                return <li key={i}><span className="lw__votos-barra" style={{ width: `${pct}%` }} aria-hidden="true" /><b>{i + 1}</b><span>{o}</span><span className="lw__pct">{v} · {pct}%</span></li>;
              })}
            </ol>
            <div className="live-central__acoes">
              {enqueteAberta && <button className="btn primary" disabled={!!busy} onClick={() => void fazer('enquete-fechar')}>Encerrar a votação</button>}
              <button className="btn quiet" disabled={!!busy} onClick={() => void fazer('enquete-tirar')}>{enqueteAberta ? 'Cancelar a enquete' : 'Tirar e fazer outra'}</button>
            </div>
          </>
        ) : (
          <>
            <label className="glr-f"><span className="glr-f__l">Pergunta</span><input className="field" value={pergunta} maxLength={90} placeholder="Qual chefe eu enfrento primeiro?" onChange={(x) => setPergunta(x.target.value)} /></label>
            <div className="lw__opcoes">
              {opcoes.map((o, i) => (
                <label key={i} className="glr-f"><span className="glr-f__l">Opção {i + 1}</span>
                  <span className="lw__opcao"><input className="field" value={o} maxLength={40} onChange={(x) => setOpcoes((l) => l.map((y, j) => (j === i ? x.target.value : y)))} />{opcoes.length > 2 && <button className="btn quiet sm" onClick={() => setOpcoes((l) => l.filter((_, j) => j !== i))} aria-label={`Tirar a opção ${i + 1}`}>Tirar</button>}</span>
                </label>
              ))}
            </div>
            <div className="live-central__acoes">
              {opcoes.length < 5 && <button className="btn ghost sm" onClick={() => setOpcoes((l) => [...l, ''])}>+ Opção</button>}
              <label className="glr-f lw__dur"><span className="glr-f__l">Tempo</span><select className="field" value={dur} onChange={(x) => setDur(Number(x.target.value))}>{DURACOES.map((d) => <option key={d.s} value={d.s}>{d.t}</option>)}</select></label>
            </div>
            <button className="btn primary" disabled={!!busy || opcoes.filter((x) => x.trim()).length < 2} onClick={() => void fazer('enquete-abrir', { pergunta, opcoes, segundos: dur })}>{busy === 'enquete-abrir' ? 'Abrindo…' : 'Abrir a enquete'}</button>
            <p className="faint">No chat (Twitch e YouTube), cada pessoa digita o número da opção. Vale o último voto de cada uma.</p>
          </>
        )}
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Sorteio</h3>{s && <Chave ligado={s.mostrar} onChange={(v) => void fazer('sorteio-mostrar', { mostrar: v })} titulo="Mostrar na tela" />}</div>
        {s ? (
          <>
            <p className={`live-central__estado${s.aberto ? ' is-ok' : ''}`}><i aria-hidden="true" />{s.aberto ? `Inscrições abertas: quem digitar ${s.palavra} entra` : 'Inscrições fechadas'} · {s.participantes} {s.participantes === 1 ? 'pessoa' : 'pessoas'}</p>
            {s.ganhador && <p className="lw__ganhou"><span className="glr-f__l">Ganhou</span><b>{s.ganhador}</b></p>}
            <div className="live-central__acoes">
              {s.aberto && <button className="btn ghost" disabled={!!busy} onClick={() => void fazer('sorteio-fechar')}>Fechar as inscrições</button>}
              <button className="btn primary" disabled={!!busy || !s.participantes} onClick={() => void fazer('sorteio-sortear')}>{busy === 'sorteio-sortear' ? 'Sorteando…' : s.ganhador ? 'Sortear outra pessoa' : 'Sortear'}</button>
              <button className="btn quiet" disabled={!!busy} onClick={() => void fazer('sorteio-tirar')}>Encerrar o sorteio</button>
            </div>
            <p className="faint">Quem já ganhou não sai de novo. O dono do canal não entra.</p>
          </>
        ) : (
          <>
            <label className="glr-f lw__campo"><span className="glr-f__l">Palavra para entrar</span><input className="field" value={palavra} maxLength={24} onChange={(x) => setPalavra(x.target.value)} /></label>
            <button className="btn primary" disabled={!!busy} onClick={() => void fazer('sorteio-abrir', { palavra })}>{busy === 'sorteio-abrir' ? 'Abrindo…' : 'Abrir o sorteio'}</button>
            <p className="faint">Quem digitar a palavra no chat (Twitch ou YouTube) entra uma vez.</p>
          </>
        )}
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">Créditos</h3></div>
        <p className="muted">A cena Créditos lista as raids, inscrições, apoios, quem chegou e quem mais falou no chat desde o começo da live. A Twitch avisa sozinha quando a live começa; se a live for só no YouTube, aperte o botão.</p>
        <p className="faint">{p.inicio ? `Contando desde as ${hora(p.inicio)} de ${new Date(p.inicio).toLocaleDateString('pt-BR')}.` : 'Ainda sem começo marcado: conta as últimas 12 horas.'}</p>
        <button className="btn ghost" disabled={!!busy} onClick={() => void fazer('nova-live')}>Começar a contar agora</button>
      </div>
    </div>
  );
}
