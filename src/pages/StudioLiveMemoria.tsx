/**
 * Central da live · o IAmiguinho no chat (etapa 4a): responder quem chama @iamiguinho e o que ele lembra das pessoas.
 * Só o que a pessoa contou para ele; a administração vê, apaga uma lembrança ou apaga a pessoa inteira.
 */
import { useEffect, useRef, useState } from 'react';
import { liveApi, type AcaoMemoria, type Memoria, type PessoaMemoria } from '../data/liveApi';

const NIVEL = (n: number) => (n <= 0 ? 'nova' : n < 3 ? 'conhecida' : n < 10 ? 'colega' : n < 30 ? 'parça' : 'melhor amizade');
const quando = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : d < 30 ? `há ${d} dias` : new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function PainelMemoria({ onMsg }: { onMsg: (m: string) => void }) {
  const [m, setM] = useState<Memoria | null | undefined>(undefined);
  const [busca, setBusca] = useState('');
  const [busy, setBusy] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [tudo, setTudo] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => { void liveApi.memoria(busca.trim()).then(setM).catch((e) => { onMsg(e instanceof Error ? e.message : 'Não deu para ler a memória.'); setM(null); }); }, busca ? 350 : 0);
    return () => clearTimeout(t.current);
  }, [busca, onMsg]);
  const fazer = async (acao: AcaoMemoria, a: Record<string, unknown>, rotulo: string) => {
    setBusy(rotulo);
    try { setM(await liveApi.memoriaAcao(acao, { ...a, busca: busca.trim() })); }
    catch (e) { onMsg(e instanceof Error ? e.message : 'Não deu certo agora.'); }
    finally { setBusy(''); }
  };

  if (m === undefined) return <p className="muted">Lendo…</p>;
  if (m === null) return <p className="muted">Falta rodar a migração 0086 no Supabase.</p>;

  return (
    <div className="lw">
      <div className="lw__cab">
        <p className="muted lw__intro">Quem marcar <code>@iamiguinho</code> no chat recebe uma resposta da IA, no jeito dele. Na Twitch, ele responde em cima da mensagem; no YouTube, a resposta aparece no balão das cenas.</p>
        <label className="motion motion--switch" data-on={m.responde}>
          <input type="checkbox" role="switch" className="switch" checked={m.responde} onChange={(e) => void fazer('mencoes', { ligado: e.target.checked }, 'mencoes')} />
          <span><strong>Responder quem chama</strong><span className="muted">Desligado, ele ignora as menções (o resto do bot continua).</span></span>
        </label>
      </div>

      <div className="lw__bloco">
        <div className="lw__cab"><h3 className="lw__h">O que ele lembra</h3><span className="faint">{m.total} {m.total === 1 ? 'pessoa' : 'pessoas'}</span></div>
        <p className="faint">Ele guarda só o que a pessoa contou para ele (e o que você contou na conversa por voz, na linha VOZ) (jogos, gostos, o que está jogando) e as últimas conversas. Nada de saúde, religião, política, idade, onde mora ou contatos. Quem digitar <code>@iamiguinho esquece de mim</code> é apagado na hora. Quanto mais conversa, mais próximo ele fica: nova, conhecida, colega, parça, melhor amizade.</p>
        <label className="glr-f lw__campo"><span className="glr-f__l">Procurar pelo nome</span><input className="field" value={busca} maxLength={40} placeholder="nome no chat" onChange={(e) => setBusca(e.target.value)} /></label>
        {!m.pessoas.length ? <p className="muted">{busca ? 'Ninguém com esse nome.' : 'Ele ainda não conversou com ninguém.'}</p> : (
          <ul className="lm__lista">
            {m.pessoas.map((p: PessoaMemoria) => (
              <li key={p.quem}>
                <div className="lm__cab">
                  <span className={`lv-chat__pl is-${p.pl}`}>{p.pl === 'yt' ? 'YT' : p.pl === 'dono' ? 'VOZ' : 'TW'}</span>
                  <b className="lm__nome">{p.pl === 'dono' ? 'Você (conversa por voz)' : p.nome}</b>
                  <span className="lm__nivel">{NIVEL(p.conversas)}</span>
                  <span className="faint">{p.conversas} {p.conversas === 1 ? 'conversa' : 'conversas'} · {quando(p.ultimaVez)}</span>
                  <span className="lb__acoes">
                    <button className="btn quiet sm" onClick={() => setAberta(aberta === p.quem ? null : p.quem)} aria-expanded={aberta === p.quem}>{aberta === p.quem ? 'Fechar' : 'Ver conversas'}</button>
                    <button className="btn quiet sm" disabled={!!busy} onClick={() => void fazer('apagar', { quem: p.quem }, `del-${p.quem}`)}>Esquecer</button>
                  </span>
                </div>
                {p.fatos.length > 0 && (
                  <ul className="lm__fatos">
                    {p.fatos.map((f, i) => <li key={`${f.t}-${i}`}>{f.t}<button className="lm__x" disabled={!!busy} onClick={() => void fazer('apagar-fato', { quem: p.quem, i }, `f-${p.quem}-${i}`)} aria-label={`Esquecer: ${f.t}`}>×</button></li>)}
                  </ul>
                )}
                {aberta === p.quem && (
                  <ol className="lm__conversas">
                    {p.recentes.map((c, i) => <li key={i}><span><b>{p.pl === 'dono' ? 'Você' : p.nome}:</b> {c.p}</span><span><b className="lm__iam">IAmiguinho:</b> {c.r}</span><span className="faint">{quando(c.em)}</span></li>)}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        )}
        {m.total > 0 && !busca && (
          <div className="live-central__acoes">
            <button className="btn quiet sm" disabled={!!busy} onClick={() => { if (!tudo) { setTudo(true); setTimeout(() => setTudo(false), 4000); return; } setTudo(false); void fazer('apagar-tudo', {}, 'tudo'); }}>{tudo ? 'Confirmar: esquecer todo mundo' : 'Esquecer todo mundo'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
