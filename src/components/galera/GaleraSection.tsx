/**
 * Álbum → Galera: as pessoas que você já tirou nos pacotes, em ordem de número de chegada. Quem falta aparece como
 * silhueta (sem revelar quem é) e quem saiu, como aposentada. Tocar abre a ficha: frente e verso, perfil e denúncia.
 * Não conta para completar a Temporada.
 */
import { useEffect, useState } from 'react';
import { Link } from '../../lib/router';
import { useStore } from '../../data/store';
import { Sheet } from '../Sheet';
import { GaleraCard, GaleraGhost } from './GaleraCard';
import { galeraApi, galeraStatus, type GaleraCard as Card, type GaleraCollection, type GaleraMine } from '../../data/galeraApi';

const SHOW_GHOSTS = 8;

export function GaleraSection() {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const [col, setCol] = useState<GaleraCollection | null>(null);
  const [me, setMe] = useState<GaleraMine | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Card | null>(null);
  useEffect(() => {
    let alive = true;
    galeraApi.collection().then((c) => { if (alive) setCol(c); }).catch((e) => { if (alive) setErr(e instanceof Error ? e.message : 'Não consegui abrir a Galera agora.'); });
    galeraApi.me().then((m) => { if (alive) setMe(m); }).catch(() => {});
    return () => { alive = false; };
  }, [mode, profile?.id]);

  if (err) return <p className="awards__error" role="alert">{err}</p>;
  if (!col) return <p className="faint">Abrindo a Galera…</p>;
  const known = col.cards.filter((c) => !c.retired);
  const missing = Math.max(0, col.total - known.length);
  return (
    <section aria-labelledby="glr-t">
      <h2 id="glr-t" className="sr-only">Galera</h2>
      <MineStrip me={me} />
      <div className="glr-head">
        <p className="glr-head__count"><b>{known.length}</b> de {col.total} {col.total === 1 ? 'pessoa' : 'pessoas'} da Galera</p>
        <p className="muted" style={{ margin: 0, maxWidth: '52ch' }}>Às vezes um pacote traz uma figurinha a mais: alguém da Galera. Ela não repete e não conta para completar a Temporada.</p>
      </div>
      {col.cards.length === 0 && missing === 0 ? (
        <div className="glr-empty"><b>A Galera ainda está chegando.</b><p className="muted" style={{ margin: 0 }}>Quando as primeiras pessoas fizerem a figurinha delas, elas começam a sair nos pacotes.</p></div>
      ) : (
        <div className="glr-grid">
          {col.cards.map((c, i) => c.retired
            ? <div key={`r${i}`} className="glr-slot"><GaleraGhost kind="gone" number={c.number} /><span className="glr-slot__cap">Saiu da Galera</span></div>
            : <button key={c.owner ?? i} type="button" className="glr-slot" onClick={() => setOpen(c)} aria-label={`Abrir a figurinha de @${c.handle}`}>
                <GaleraCard card={c} still /><span className="glr-slot__cap">@{c.handle}</span>
              </button>)}
          {Array.from({ length: Math.min(missing, SHOW_GHOSTS) }, (_, i) => <div key={`u${i}`} className="glr-slot"><GaleraGhost kind="unknown" /><span className="glr-slot__cap">&nbsp;</span></div>)}
        </div>
      )}
      {missing > SHOW_GHOSTS && <p className="faint" style={{ marginTop: 16 }}>E mais {missing - SHOW_GHOSTS} esperando nos pacotes.</p>}
      {open && <GaleraSheet card={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function MineStrip({ me }: { me: GaleraMine | null }) {
  if (!me) return null;
  const st = galeraStatus(me);
  const live = me.card?.live ?? me.card?.pending;
  const text = st === 'ativa' ? 'Sua figurinha está na Galera e pode sair nos pacotes de outras pessoas.'
    : st === 'pausada' ? 'Sua figurinha está pausada: não sai em pacotes novos.'
    : st === 'analise' ? 'Sua figurinha está em análise. Assim que for aprovada, ela entra na Galera.'
    : st === 'recusada' ? 'Sua figurinha não foi aprovada. Dá para ajustar e enviar de novo.'
    : `Você também pode ter a sua figurinha: o seu número de chegada é o nº ${String(me.number ?? 0).padStart(3, '0')}${me.fundador ? ', de Fundador' : ''}.`;
  return (
    <div className="glr-mine">
      {live && <div className="glr-mine__card"><GaleraCard card={live} still /></div>}
      <div className="glr-mine__text"><b>{st === 'fora' ? 'Entre para a Galera' : 'Sua figurinha'}</b><span className="muted">{text}</span></div>
      <Link className={st === 'fora' ? 'btn now' : 'btn ghost'} to="/preferencias#figurinha">{st === 'fora' ? 'Fazer a minha' : 'Ver e editar'}</Link>
    </div>
  );
}

/** Ficha de uma figurinha da Galera: vira para ver o verso, leva ao perfil e permite denunciar. */
export function GaleraSheet({ card, onClose }: { card: Card; onClose: () => void }) {
  const [flip, setFlip] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const report = async (reason: 'imagem' | 'frase' | 'outro') => {
    if (!card.owner) return;
    setErr('');
    try { await galeraApi.report(card.owner, reason); setMsg('Obrigado. A figurinha saiu dos pacotes até a administração olhar.'); setReporting(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para denunciar agora.'); }
  };
  return (
    <Sheet title={`@${card.handle}`} onClose={onClose} labelId="glr-sheet-t" wide>
      <div className="glr-sheet">
        <button type="button" className="glr-sheet__card" onClick={() => setFlip((f) => !f)} aria-label={flip ? 'Ver a frente' : 'Ver o verso'} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
          <div className={`glr-flip${flip ? ' is-flipped' : ''}`}>
            <GaleraCard card={card} />
            <GaleraCard card={card} back still />
          </div>
        </button>
        <div className="glr-sheet__side">
          <p className="muted" style={{ margin: 0 }}>Nº {String(card.number ?? 0).padStart(3, '0')}{card.fundador ? ' · Fundador' : ''}{card.drawnAt ? ` · tirada em ${new Date(card.drawnAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}` : ''}</p>
          {card.game && <p style={{ margin: 0 }}>Jogo marcante: <b>{card.game}</b></p>}
          <Link className="btn now" to={`/@${card.handle}`} onClick={onClose}>Ver o perfil</Link>
          <button className="btn quiet" onClick={() => setFlip((f) => !f)}>{flip ? 'Ver a frente' : 'Ver o verso'}</button>
          <p className="faint" style={{ margin: 0, fontSize: 13 }}>Os acenos chegam na próxima fase da Galera.</p>
          {msg ? <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p> : reporting ? (
            <div className="glr-report">
              <b>O que há de errado?</b>
              <div className="chips">
                <button className="chip" onClick={() => void report('imagem')}>Imagem imprópria</button>
                <button className="chip" onClick={() => void report('frase')}>Frase imprópria</button>
                <button className="chip" onClick={() => void report('outro')}>Outro problema</button>
              </div>
              <button className="btn quiet sm" onClick={() => setReporting(false)}>Cancelar</button>
            </div>
          ) : <button className="btn quiet sm" onClick={() => setReporting(true)}>Denunciar esta figurinha</button>}
          {err && <p className="awards__error" role="alert">{err}</p>}
        </div>
      </div>
    </Sheet>
  );
}
