import { actions, useStore } from '../data/store';
import { Link } from '../lib/router';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { ConfirmButton } from '../components/Sheet';
import { shortPlatform } from '../lib/platforms';

const DAYS = 30;
const left = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) + DAYS * 86400000 - Date.now()) / 86400000));

/** Coleção → Lixeira: o que saiu da coleção fica 30 dias e volta com um toque. */
export function TrashPage() {
  const s = useStore((x) => x);
  const copies = (s.trashCopies ?? []).filter((c) => left(c.deletedAt) > 0);
  const hw = (s.trashHardware ?? []).filter((h) => left(h.deletedAt) > 0);
  const total = copies.length + hw.length;
  const v14 = s.mode === 'demo' || !!s.schemaV14;

  return (
    <main className="page pad trash">
      <header className="page-head">
        <div className="page-head__text">
          <Link className="back" to="/colecao">← Estante</Link>
          <h1 className="t big">Lixeira</h1>
          <p className="muted lead">O que você tira da coleção fica aqui por {DAYS} dias. Depois disso, sai de vez.</p>
        </div>
        <div className="page-head__side"><SubNav pillar="colecao" /></div>
      </header>

      {!v14 && <div className="card tl-empty"><p className="muted">A lixeira chega com a migração 0014 no Supabase. Até lá, tirar da coleção apaga na hora.</p></div>}
      {v14 && !total && <div className="card tl-empty"><p className="muted">A lixeira está vazia. <Link to="/colecao">Voltar para a estante</Link></p></div>}

      {total > 0 && (
        <>
          <ul className="trash__list">
            {copies.map((c) => {
              const g = s.games[c.gameId];
              return (
                <li key={c.id} className="trash__row">
                  <span className="trash__cover">{g ? <CoverArt game={g} platform={c.platform} /> : null}</span>
                  <span className="trash__text"><b>{g?.title ?? 'Jogo'}</b><span className="muted">{shortPlatform(c.platform)}{c.edition ? ` · ${c.edition}` : ''}</span></span>
                  <span className="kicker trash__left">{left(c.deletedAt)} {left(c.deletedAt) === 1 ? 'dia' : 'dias'}</span>
                  <span className="trash__acts">
                    <button className="btn ghost sm" onClick={() => actions.restoreFromTrash('copy', c.id)}>Devolver à estante</button>
                    <ConfirmButton className="btn quiet sm danger" label="Apagar de vez" confirm="Toque de novo" onConfirm={() => actions.purgeFromTrash('copy', c.id)} />
                  </span>
                </li>
              );
            })}
            {hw.map((h) => (
              <li key={h.id} className="trash__row">
                <span className="trash__cover trash__cover--hw" aria-hidden="true">{h.platform ? shortPlatform(h.platform) : '—'}</span>
                <span className="trash__text"><b>{h.name}</b><span className="muted">{h.kind === 'acessorio' ? 'Acessório' : h.kind === 'portatil' ? 'Portátil' : 'Console'}{h.model ? ` · ${h.model}` : ''}</span></span>
                <span className="kicker trash__left">{left(h.deletedAt)} {left(h.deletedAt) === 1 ? 'dia' : 'dias'}</span>
                <span className="trash__acts">
                  <button className="btn ghost sm" onClick={() => actions.restoreFromTrash('hardware', h.id)}>Devolver</button>
                  <ConfirmButton className="btn quiet sm danger" label="Apagar de vez" confirm="Toque de novo" onConfirm={() => actions.purgeFromTrash('hardware', h.id)} />
                </span>
              </li>
            ))}
          </ul>
          <div className="trash__empty">
            <ConfirmButton label={`Esvaziar a lixeira (${total})`} confirm="Toque de novo para apagar tudo de vez" onConfirm={() => actions.emptyTrash()} />
          </div>
        </>
      )}
    </main>
  );
}
