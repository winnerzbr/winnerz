/**
 * Studio · o contexto do IAmiguinho (migração 0088). Tudo o que ele recebe nas conversas da live (voz e chat), sempre
 * atualizado: a personalidade, o repertório, o contexto do canal, o que ele lembra de você e as últimas conversas.
 * Os três textos e as lembranças mudam aqui, a qualquer hora; a identidade e os limites de segurança ficam fixos.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { Icon } from '../components/Icon';
import { sofaApi, type ContextoIam } from '../data/sofaApi';
import { liveApi } from '../data/liveApi';

type Campo = 'personalidade' | 'repertorio' | 'extra';
const QUEM_DONO = 'dono:canal';
const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function Texto({ titulo, dica, valor, padrao, campo, salvo, onSalvar, busy }: { titulo: string; dica: string; valor: string; padrao: string | null; campo: Campo; salvo: boolean; onSalvar: (c: Campo, v: string | null) => void; busy: boolean }) {
  const [t, setT] = useState(valor);
  useEffect(() => setT(valor), [valor]);
  const mudou = t !== valor;
  return (
    <section className="iamc__bloco" aria-labelledby={`iamc-${campo}`}>
      <div className="iamc__cab">
        <h2 id={`iamc-${campo}`} className="t iamc__h">{titulo}</h2>
        <span className={`iamc__selo${salvo ? ' is-seu' : ''}`}>{salvo ? 'Seu texto' : padrao ? 'Texto padrão' : 'Vazio'}</span>
      </div>
      <p className="muted iamc__dica">{dica}</p>
      <textarea className="field iamc__area" rows={campo === 'extra' ? 6 : 10} value={t} maxLength={campo === 'extra' ? 4000 : 6000} onChange={(e) => setT(e.target.value)} />
      <div className="live-central__acoes">
        <button className="btn primary sm" disabled={busy || !mudou} onClick={() => onSalvar(campo, t.trim() ? t : null)}>{mudou ? 'Salvar' : 'Salvo'}</button>
        {mudou && <button className="btn quiet sm" onClick={() => setT(valor)}>Desfazer</button>}
        {salvo && padrao && <button className="btn quiet sm" disabled={busy} onClick={() => onSalvar(campo, null)}>Voltar ao texto padrão</button>}
        {salvo && !padrao && <button className="btn quiet sm" disabled={busy} onClick={() => onSalvar(campo, null)}>Apagar</button>}
        <span className="faint">{t.length} / {campo === 'extra' ? 4000 : 6000}</span>
      </div>
    </section>
  );
}

export function StudioIAmiguinhoPage() {
  const admin = !!useStore((x) => x.isAdmin);
  const [c, setC] = useState<ContextoIam | null>(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [novoFato, setNovoFato] = useState('');
  const ler = useCallback(async () => {
    try { setC(await sofaApi.contexto()); setErro(''); } catch (e) { setErro(e instanceof Error ? e.message : 'Não deu para ler o contexto agora.'); }
  }, []);
  // Sempre atualizado: lê de novo a cada 15 s (as conversas mudam a memória dele).
  useEffect(() => {
    if (!admin) return;
    void ler();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void ler(); }, 15_000);
    return () => clearInterval(t);
  }, [admin, ler]);

  if (!admin) return (
    <main className="page pad narrow">
      <h1 className="t big">Contexto do IAmiguinho</h1>
      <p className="muted lead">Esta tela é só da administração do WinnerZ.</p>
    </main>
  );

  const salvar = async (campo: Campo, v: string | null) => {
    setBusy(true); setMsg('');
    try { setC(await sofaApi.contexto({ [campo]: v })); setMsg(v == null ? 'Voltou ao texto padrão. Vale a partir da próxima conversa.' : 'Salvo. Vale a partir da próxima conversa.'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu para salvar agora.'); }
    finally { setBusy(false); }
  };
  const fato = async (acao: 'adicionar-fato' | 'apagar-fato', a: Record<string, unknown>) => {
    setBusy(true); setMsg('');
    try { await liveApi.memoriaAcao(acao, { quem: QUEM_DONO, ...a }); if (acao === 'adicionar-fato') setNovoFato(''); await ler(); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); }
    finally { setBusy(false); }
  };

  return (
    <main className="page pad iamc">
      <header className="live-central__head">
        <Link to="/studio" className="sofa__back"><Icon name="voltar" size={16} />Studio</Link>
        <h1 className="t sofa__title">Contexto do IAmiguinho</h1>
        <p className="muted sofa__lead">Tudo o que ele recebe nas conversas da live (pela voz e no chat), sempre atualizado. Mude a personalidade, o repertório e o contexto do canal quando quiser: vale na próxima conversa.</p>
      </header>
      {erro && <p className="awards__error" role="alert">{erro}</p>}
      {msg && <p className="live-central__msg" role="status">{msg}</p>}
      {!c ? <p className="muted">Lendo…</p> : (
        <>
          {!c.migracao && <p className="live-central__msg">Falta rodar a migração 0088 no Supabase para salvar os textos e escrever lembranças.</p>}

          <section className="iamc__bloco iamc__agora" aria-labelledby="iamc-agora">
            <div className="iamc__cab">
              <h2 id="iamc-agora" className="t iamc__h">Como ele está agora</h2>
              <span className="faint">{c.atual.atualizadoEm ? `Textos mudados em ${quando(c.atual.atualizadoEm)}` : 'Com os textos padrão'} · atualiza sozinho</span>
            </div>
            <p className="muted iamc__dica">Exatamente o que vai para a IA numa conversa por voz, menos a sua pergunta e a tela do jogo (que mudam a cada vez). No chat, a parte de cima é a mesma; muda só o fim (as regras do chat).</p>
            <details className="iamc__previa" open>
              <summary>O texto dele (personalidade, repertório, contexto e regras)</summary>
              <pre>{c.previa.sistema}</pre>
            </details>
            <details className="iamc__previa" open>
              <summary>O que vai junto: a memória dele com você</summary>
              <pre>{c.previa.memoria}</pre>
            </details>
          </section>

          <Texto campo="personalidade" titulo="Personalidade" dica="Quem ele é e como ele fala: o jeito de zoar, a autoestima, as manias. Comece do texto padrão e mude o que quiser." valor={c.atual.personalidade ?? c.padrao.personalidade} padrao={c.padrao.personalidade} salvo={c.atual.personalidade != null} onSalvar={(k, v) => void salvar(k, v)} busy={busy} />
          <Texto campo="repertorio" titulo="Repertório de memes e referências" dica="Os consensos da comunidade gamer e os memes da internet que ele conhece. Uma linha por assunto, começando com um traço." valor={c.atual.repertorio ?? c.padrao.repertorio} padrao={c.padrao.repertorio} salvo={c.atual.repertorio != null} onSalvar={(k, v) => void salvar(k, v)} busy={busy} />
          <Texto campo="extra" titulo="Contexto do canal" dica="O que ele precisa saber sobre o canal e a live: dia e horário, o que você está jogando na temporada, apelidos, piadas internas do chat, assuntos que você não quer na live. Ele trata como verdade." valor={c.atual.extra ?? ''} padrao={null} salvo={c.atual.extra != null} onSalvar={(k, v) => void salvar(k, v)} busy={busy} />

          <section className="iamc__bloco" aria-labelledby="iamc-memoria">
            <div className="iamc__cab">
              <h2 id="iamc-memoria" className="t iamc__h">O que ele lembra de você</h2>
              <span className="faint">{c.memoria.conversas} {c.memoria.conversas === 1 ? 'conversa' : 'conversas'}{c.memoria.ultimaVez ? ` · última em ${quando(c.memoria.ultimaVez)}` : ''}</span>
            </div>
            <p className="muted iamc__dica">Ele junta sozinho o que você conta nas conversas por voz. Aqui dá para escrever lembranças à mão (essas nunca saem sozinhas) e apagar as que não quiser.</p>
            {c.memoria.fatos.length ? (
              <ul className="lm__fatos">{c.memoria.fatos.map((f, i) => <li key={`${f}-${i}`}>{f}<button className="lm__x" disabled={busy} onClick={() => void fato('apagar-fato', { i })} aria-label={`Esquecer: ${f}`}>×</button></li>)}</ul>
            ) : <p className="faint">Nenhuma lembrança ainda.</p>}
            <form className="sofa__escrever" onSubmit={(e) => { e.preventDefault(); if (novoFato.trim()) void fato('adicionar-fato', { t: novoFato }); }}>
              <input className="field" value={novoFato} maxLength={120} placeholder="Ex.: estou zerando Elden Ring nesta temporada" onChange={(e) => setNovoFato(e.target.value)} aria-label="Nova lembrança" />
              <button className="btn ghost" type="submit" disabled={busy || !novoFato.trim()}>Lembrar</button>
            </form>
            {c.memoria.recentes.length > 0 && (
              <>
                <span className="glr-f__l">Últimas conversas</span>
                <ol className="lm__conversas">{c.memoria.recentes.map((x, i) => <li key={i}><span><b>Você:</b> {x.pergunta}</span><span><b className="lm__iam">IAmiguinho:</b> {x.resposta}</span><span className="faint">{quando(x.em)}</span></li>)}</ol>
              </>
            )}
            <p className="faint">O que ele lembra de quem fala no chat fica na <Link to="/studio/live">Central da live</Link>, no bloco "IAmiguinho no chat".</p>
          </section>

          <section className="iamc__bloco" aria-labelledby="iamc-fixo">
            <h2 id="iamc-fixo" className="t iamc__h">Regras fixas</h2>
            <p className="muted iamc__dica">Estas não mudam por aqui: são os limites que deixam ele seguro ao vivo e as regras de cada lugar onde ele fala.</p>
            <details className="iamc__previa"><summary>Limites</summary><pre>{c.fixo.limites}</pre></details>
            <details className="iamc__previa"><summary>Como ser engraçado (guia de humor)</summary><pre>{c.fixo.graca}</pre></details>
            <details className="iamc__previa"><summary>Na conversa por voz</summary><pre>{c.fixo.voz}</pre></details>
            <details className="iamc__previa"><summary>No chat da live</summary><pre>{c.fixo.chat}</pre></details>
          </section>
        </>
      )}
    </main>
  );
}
