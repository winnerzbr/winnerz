/**
 * Studio → Álbum → Galera: a fila de figurinhas para aprovar (como vão sair), as denúncias e a chance de vir +1 da
 * Galera em cada pacote. Nada sai nos pacotes sem passar por aqui.
 */
import { useEffect, useState } from 'react';
import { Link } from '../../lib/router';
import { GaleraCard } from './GaleraCard';
import { studioGaleraApi, type GaleraStudio as Data } from '../../data/galeraApi';

const REASONS: [string, string][] = [['avatar', 'Avatar com personagem ou marca'], ['imagem', 'Imagem imprópria'], ['frase', 'Frase imprópria'], ['outro', 'Outro']];
const REPORT_LABEL: Record<string, string> = { imagem: 'imagem', frase: 'frase', outro: 'outro' };

export function GaleraStudio({ say, fail }: { say: (m: string) => void; fail: (e: unknown) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [chance, setChance] = useState('25');
  useEffect(() => { studioGaleraApi.load().then((x) => { setD(x); setChance(String(Math.round(x.chance * 100))); }).catch(fail); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <p className="faint">Abrindo a Galera…</p>;
  const act = async (p: Promise<Data>, m: string) => { try { const x = await p; setD(x); say(m); } catch (e) { fail(e); } };
  return (
    <div className="glr-studio">
      <section aria-labelledby="glr-q-t">
        <h2 id="glr-q-t" className="t" style={{ fontSize: 22 }}>Para aprovar ({d.queue.length})</h2>
        <p className="muted">É assim que a figurinha vai sair. Recuse avatar com personagem ou marca de outra empresa; se só o avatar estiver errado, aprove com o avatar padrão.</p>
        {d.queue.length === 0 ? <p className="faint">Nada esperando agora.</p> : (
          <div className="glr-q">
            {d.queue.map((q) => <QueueItem key={q.pending.owner ?? q.submittedAt} q={q} onDecide={(action, reason, note) => void act(studioGaleraApi.decide(q.pending.owner!, action, reason, note), action === 'recusar' ? 'Recusada. A pessoa recebe o motivo.' : 'Aprovada. Ela já pode sair nos pacotes.')} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="glr-r-t">
        <h2 id="glr-r-t" className="t" style={{ fontSize: 22 }}>Denúncias ({d.reports.length})</h2>
        <p className="muted">A figurinha denunciada sai dos pacotes na hora. Mantenha, ou tire o retrato e a frase (ela passa a sair com o avatar padrão).</p>
        {d.reports.length === 0 ? <p className="faint">Nenhuma denúncia aberta.</p> : (
          <div className="glr-q">
            {d.reports.map((r) => (
              <div key={r.person?.id ?? r.firstAt} className="glr-q__item">
                {r.card && <div className="glr-q__card"><GaleraCard card={r.card} still /></div>}
                <div className="glr-q__side">
                  <b>@{r.person?.handle ?? '?'}</b>
                  <span className="muted">{r.count} {r.count === 1 ? 'denúncia' : 'denúncias'}: {r.reasons.map((x) => REPORT_LABEL[x] ?? x).join(', ')}</span>
                  <div className="row">
                    <button className="btn ghost sm" onClick={() => r.person && void act(studioGaleraApi.closeReport(r.person.id, true), 'Mantida. Ela volta para os pacotes.')}>Manter</button>
                    <button className="btn quiet danger sm" onClick={() => r.person && void act(studioGaleraApi.closeReport(r.person.id, false), 'Retrato e frase retirados.')}>Tirar retrato e frase</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="glr-c-t">
        <h2 id="glr-c-t" className="t" style={{ fontSize: 22 }}>Chance nos pacotes</h2>
        <p className="muted">{d.active} {d.active === 1 ? 'figurinha está' : 'figurinhas estão'} saindo nos pacotes agora. O pacote de boas-vindas sempre traz uma, quando há alguém disponível.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label htmlFor="glr-chance">Chance de +1 da Galera por pacote</label>
          <input id="glr-chance" className="field" style={{ width: 96 }} type="number" min={0} max={100} step={5} value={chance} onChange={(e) => setChance(e.target.value)} />
          <span>%</span>
          <button className="btn ghost sm" onClick={() => void act(studioGaleraApi.chance(Math.max(0, Math.min(100, Number(chance) || 0)) / 100), 'Chance salva.')}>Salvar</button>
        </div>
        <p className="faint" style={{ marginTop: 12 }}>A figurinha de cada pessoa é editada por ela em <Link to="/preferencias#figurinha">Preferências</Link>.</p>
      </section>
    </div>
  );
}

function QueueItem({ q, onDecide }: { q: Data['queue'][number]; onDecide: (a: 'aprovar' | 'padrao' | 'recusar', reason?: string, note?: string) => void }) {
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="glr-q__item">
      <div className="glr-q__card"><GaleraCard card={q.pending} still /></div>
      <div className="glr-q__side">
        <b>@{q.person?.handle ?? q.pending.handle}</b>
        <span className="faint" style={{ fontSize: 13 }}>{q.live ? 'Alteração de uma figurinha já aprovada' : 'Primeira figurinha'} · {new Date(q.submittedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
        {!refusing ? (
          <div className="row">
            <button className="btn now sm" onClick={() => onDecide('aprovar')}>Aprovar</button>
            {q.pending.portrait && <button className="btn ghost sm" onClick={() => onDecide('padrao')}>Aprovar com avatar padrão</button>}
            <button className="btn quiet sm" onClick={() => setRefusing(true)}>Recusar</button>
          </div>
        ) : (
          <>
            <div className="row" role="group" aria-label="Motivo">
              {REASONS.map(([k, l]) => <button key={k} className="chip" aria-pressed={reason === k} onClick={() => setReason(k)}>{l}</button>)}
            </div>
            <input className="field" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Uma linha para a pessoa (opcional)" aria-label="Recado para a pessoa" />
            <div className="row">
              <button className="btn quiet danger sm" disabled={!reason} onClick={() => onDecide('recusar', reason, note.trim())}>Recusar com esse motivo</button>
              <button className="btn quiet sm" onClick={() => setRefusing(false)}>Voltar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
