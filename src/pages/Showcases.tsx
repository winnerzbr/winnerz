import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore } from '../data/store';
import type { PieceRef, Showcase } from '../data/types';
import { SubNav } from '../components/SubNav';
import { Sheet, ConfirmButton } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { PiecePicker } from '../components/PiecePicker';
import { Cabinet, Shelf, ShelfPiece, shelfItem } from '../components/Showcase';
import { ruleLabel, showcasePieces, suggestions, type Suggestion } from '../lib/showcases';

const MIGRATION = 'Para guardar Vitrines, rode a migração 0015 no Supabase (SQL Editor → colar → Run).';

/** Coleção → Vitrines: as que você guardou e as que a sua coleção já monta sozinha. */
export function ShowcasesPage() {
  const s = useStore((x) => x);
  const ready = s.mode === 'demo' || !!s.schemaV15;
  const saved = useMemo(() => [...(s.showcases ?? [])].sort((a, b) => a.position - b.position), [s.showcases]);
  const sugg = useMemo(() => suggestions(s), [s]);
  const [creating, setCreating] = useState(false);
  const [arranging, setArranging] = useState(false);
  useEffect(() => { document.title = 'Vitrines · WinnerZ'; }, []);

  const move = (i: number, d: -1 | 1) => {
    const ids = saved.map((x) => x.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    actions.orderShowcases(ids);
  };
  const keep = (g: Suggestion) => actions.saveShowcase({ title: g.title, description: g.description, kind: 'inteligente', rule: g.rule, items: [] });

  return (
    <main className="page pad vitrines">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Vitrines</h1>
          <p className="muted lead">Recortes da coleção para mostrar uma ideia. As prontas se atualizam sozinhas; as suas, você monta peça por peça.</p>
        </div>
        <div className="page-head__side">
          <div className="collection__tools">
            {saved.length > 1 && <button className="btn ghost" aria-pressed={arranging} onClick={() => setArranging(!arranging)}>{arranging ? 'Pronto' : 'Organizar'}</button>}
            <button className="btn primary" onClick={() => setCreating(true)} disabled={!ready || !s.copies.length}><Icon name="mais" size={16} />Nova vitrine</button>
          </div>
          <SubNav pillar="colecao" />
        </div>
      </header>

      {!ready && <div className="card tl-empty"><p className="muted">{MIGRATION}</p></div>}
      {ready && !s.copies.length && <div className="card tl-empty"><p className="muted">As vitrines usam o que está na sua estante. Quando houver jogos lá, elas aparecem aqui sozinhas.</p><Link className="btn primary" to="/colecao">Ir para a Estante</Link></div>}

      {saved.length > 0 && (
        <section className="vlist" aria-label="Suas vitrines">
          {saved.map((sc, i) => (
            <ShowcaseCard key={sc.id} sc={sc}>
              {arranging && (
                <span className="vcard__order">
                  <button className="icon-btn" aria-label={`Subir ${sc.title}`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="icon-btn" aria-label={`Descer ${sc.title}`} disabled={i === saved.length - 1} onClick={() => move(i, 1)}>↓</button>
                </span>
              )}
            </ShowcaseCard>
          ))}
        </section>
      )}

      {ready && sugg.length > 0 && (
        <section className="vsugg" aria-labelledby="vsugg-h">
          <h2 id="vsugg-h" className="kicker vsugg__h">{saved.length ? 'Mais vitrines que a sua coleção já monta' : 'A sua coleção já monta estas vitrines'}</h2>
          <p className="muted vsugg__lead">Guardar não muda nada na coleção: só deixa a vitrine com você, para dar nome, contar a história e, se quiser, mostrar no perfil.</p>
          <div className="vlist">
            {sugg.map((g) => (
              <article key={g.key} className="vcard vcard--sugg">
                <div className="vcard__head">
                  <div>
                    <span className="kicker">Sempre em dia · {g.count} {g.count === 1 ? 'peça' : 'peças'}</span>
                    <h3 className="t vcard__title">{g.title}</h3>
                    <p className="muted vcard__desc">{g.description}</p>
                  </div>
                  <button className="btn ghost sm" onClick={() => keep(g)} disabled={!ready}>Guardar esta vitrine</button>
                </div>
                <Shelf compact items={showcasePieces(s, { kind: 'inteligente', rule: g.rule, items: [] }).slice(0, 12).map(shelfItem)} />
              </article>
            ))}
          </div>
        </section>
      )}

      {creating && <NewShowcase onClose={() => setCreating(false)} />}
    </main>
  );
}

function ShowcaseCard({ sc, children }: { sc: Showcase; children?: ReactNode }) {
  const s = useStore((x) => x);
  const pieces = showcasePieces(s, sc);
  return (
    <article className="vcard">
      <div className="vcard__head">
        <div>
          <span className="kicker">{sc.kind === 'inteligente' ? 'Sempre em dia' : 'Montada por você'} · {pieces.length} {pieces.length === 1 ? 'peça' : 'peças'}{sc.shared ? <span className="vcard__pub"> · No seu perfil</span> : null}</span>
          <h3 className="t vcard__title"><Link to={`/colecao/vitrines/${sc.id}`}>{sc.title}</Link></h3>
          {sc.description && <p className="muted vcard__desc">{sc.description}</p>}
        </div>
        {children ?? <Link className="btn ghost sm" to={`/colecao/vitrines/${sc.id}`}>Abrir</Link>}
      </div>
      <Shelf compact items={pieces.slice(0, 12).map(shelfItem)} empty="Nenhuma peça por enquanto. Abra a vitrine para escolher." />
    </article>
  );
}

function NewShowcase({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<PieceRef[]>([]);
  const ok = title.trim().length > 0;
  const save = () => {
    if (!ok) return;
    const sc = actions.saveShowcase({ title: title.trim().slice(0, 80), description: description.trim().slice(0, 400) || undefined, kind: 'curada', items });
    onClose();
    navigate(`/colecao/vitrines/${sc.id}`);
  };
  return (
    <Sheet title="Nova vitrine" onClose={onClose} labelId="vnova" wide>
      <form className="cform" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="cform__grid">
          <label className="cform__wide">Nome<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required autoFocus placeholder="Ex.: Os que me formaram, Lado B do PS2" /></label>
          <label className="cform__wide">A história da vitrine <span className="faint">(opcional)</span><textarea className="field" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} placeholder="Por que estas peças estão juntas?" /></label>
        </div>
        <PiecePicker value={items} onChange={setItems} />
        <div className="sheet__actions">
          <button type="submit" className="btn primary lg" disabled={!ok}>Criar vitrine</button>
          <button type="button" className="btn quiet" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Sheet>
  );
}

/** Uma vitrine aberta: a exposição primeiro; editar acontece ali mesmo. */
export function ShowcasePage({ id }: { id: string }) {
  const s = useStore((x) => x);
  const sc = (s.showcases ?? []).find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [title, setTitle] = useState(sc?.title ?? '');
  const [desc, setDesc] = useState(sc?.description ?? '');
  useEffect(() => { document.title = `${sc?.title ?? 'Vitrine'} · WinnerZ`; }, [sc?.title]);
  useEffect(() => { if (!editing && sc) { setTitle(sc.title); setDesc(sc.description ?? ''); } }, [sc, editing]);

  if (!sc) {
    return (
      <main className="page pad">
        <p className="muted">Esta vitrine não existe mais. <Link to="/colecao/vitrines">Voltar às Vitrines</Link></p>
      </main>
    );
  }
  const pieces = showcasePieces(s, sc);
  const save = (patch: Partial<Showcase>) => actions.saveShowcase({ ...sc, ...patch });
  const finish = () => {
    save({ title: title.trim().slice(0, 80) || sc.title, description: desc.trim().slice(0, 400) || undefined });
    setEditing(false); setPicking(false);
  };
  const moveItem = (i: number, d: -1 | 1) => {
    const items = [...sc.items], j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    save({ items });
  };
  // Itens que já não existem (exemplar apagado de vez) não contam na ordem visível.
  const live = sc.items.map((r, i) => ({ r, i })).filter(({ r }) => pieces.some((p) => p.ref.t === r.t && p.ref.id === r.id));

  return (
    <main className="page pad vitrine">
      <Link to="/colecao/vitrines" className="kicker vitrine__back">← Vitrines</Link>
      <header className="vitrine__head">
        <span className="kicker">{sc.kind === 'inteligente' ? `Sempre em dia · ${ruleLabel(sc.rule)}` : 'Montada por você'} · {pieces.length} {pieces.length === 1 ? 'peça' : 'peças'}</span>
        {editing ? (
          <div className="cform vitrine__form">
            <label>Nome<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></label>
            <label>A história da vitrine<textarea className="field" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={400} placeholder="Por que estas peças estão juntas?" /></label>
          </div>
        ) : (
          <>
            <h1 className="t big vitrine__title">{sc.title}</h1>
            {sc.description && <p className="lead vitrine__desc">{sc.description}</p>}
          </>
        )}
        <div className="vitrine__actions">
          {editing ? <button className="btn primary" onClick={finish}>Pronto</button> : <button className="btn ghost" onClick={() => setEditing(true)}>Editar</button>}
          <label className="vitrine__share">
            <input type="checkbox" role="switch" className="switch" checked={!!sc.shared} onChange={() => save({ shared: !sc.shared })} />
            <span>Mostrar no meu perfil</span>
          </label>
        </div>
        {sc.shared && <p className="faint vitrine__hint">Aparece para quem pode ver a sua Coleção (<Link to="/preferencias#perfil">Perfil e privacidade</Link>). Mostra só capa, título e plataforma; nada da ficha dos exemplares.</p>}
      </header>

      {editing && sc.kind === 'curada' ? (
        <section className="vedit" aria-label="Peças da vitrine">
          <div className="vedit__grid">
            {live.map(({ r, i }, k) => {
              const p = pieces.find((x) => x.ref.t === r.t && x.ref.id === r.id)!;
              return (
                <ShelfPiece key={`${r.t}-${r.id}`} it={shelfItem(p)} link={false}>
                  <span className="vedit__tools">
                    <button className="icon-btn" aria-label="Para a esquerda" disabled={k === 0} onClick={() => moveItem(i, -1)}>←</button>
                    <button className="icon-btn" aria-label="Para a direita" disabled={k === live.length - 1} onClick={() => moveItem(i, 1)}>→</button>
                    <button className="icon-btn" aria-label="Tirar da vitrine" onClick={() => save({ items: sc.items.filter((_, x) => x !== i) })}>×</button>
                  </span>
                </ShelfPiece>
              );
            })}
          </div>
          {picking ? (
            <div className="vedit__pick">
              <PiecePicker value={sc.items} onChange={(items) => save({ items })} />
              <button className="btn ghost" onClick={() => setPicking(false)}>Fechar a escolha</button>
            </div>
          ) : (
            <button className="btn ghost" onClick={() => setPicking(true)}><Icon name="mais" size={16} />Adicionar ou tirar peças</button>
          )}
        </section>
      ) : (
        <Cabinet items={pieces.map(shelfItem)} owner={s.profile?.name} empty={sc.kind === 'curada' ? 'Nenhuma peça ainda. Toque em Editar para escolher.' : 'Hoje nada da coleção entra nesta regra.'} />
      )}

      {editing && (
        <section className="vitrine__more">
          {sc.kind === 'inteligente' && (
            <div className="card vitrine__rule">
              <p>Esta vitrine se monta sozinha com {ruleLabel(sc.rule)}. Quer escolher e ordenar as peças você mesmo?</p>
              <button className="btn ghost sm" onClick={() => save({ kind: 'curada', items: pieces.map((p) => p.ref) })}>Passar a montar à mão</button>
            </div>
          )}
          <div className="sheet__danger">
            <ConfirmButton label="Apagar esta vitrine" confirm="Toque de novo para apagar" onConfirm={() => { actions.deleteShowcase(sc.id); navigate('/colecao/vitrines'); }} />
            <p className="faint">Apagar a vitrine não tira nada da coleção.</p>
          </div>
        </section>
      )}
    </main>
  );
}
