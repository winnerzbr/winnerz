import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { communityApi, slugOk, type Community } from '../data/communityApi';
import { canReview } from '../data/fixesApi';
import { useStore } from '../data/store';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');

/** Studio: renomear (o endereço antigo continua levando para o novo) e juntar comunidades repetidas. */
export function StudioCommunitiesPage() {
  useStore((s) => s.mode);
  const [q, setQ] = useState('');
  const [list, setList] = useState<Community[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { document.title = 'Comunidades · Studio · WinnerZ'; }, []);
  const load = () => { communityApi.list(q).then(setList).catch(() => setList([])); };
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!canReview()) return <main className="page pad narrow"><h1 className="t big">Studio</h1><p className="muted lead">Esta área é só da administração do WinnerZ.</p></main>;
  return (
    <main className="page pad studio">
      <header className="studio__head">
        <Link to="/studio" className="faint">← Studio</Link>
        <h1 className="t big">Comunidades</h1>
        <p className="muted lead">Renomeie uma comunidade (o endereço antigo continua levando para o novo) ou junte duas repetidas: as conversas, quem segue, as jogatinas e os clubes passam para a que fica, e quem criou a outra passa a moderar.</p>
      </header>
      {msg && <p className="jog-invite__note" role="status">{msg}</p>}
      <label className="cm-index__q"><input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar comunidade" aria-label="Buscar comunidade" /></label>
      {list == null ? <p className="faint">Carregando…</p> : (
        <ul className="st-comms">
          {list.map((c) => (
            <li key={c.id} className="st-comms__i">
              <div className="st-comms__row">
                <span><b>{c.name}</b> <span className="mono faint">w/{c.slug}</span><small className="faint"> · {c.members} {c.members === 1 ? 'pessoa' : 'pessoas'} · {c.posts} {c.posts === 1 ? 'conversa' : 'conversas'}{c.owner?.handle ? ` · criada por @${c.owner.handle}` : ''}</small></span>
                <span className="st-comms__acts">
                  <Link className="btn quiet sm" to={`/w/${c.slug}`}>Abrir</Link>
                  <button className="btn ghost sm" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Fechar' : 'Renomear ou juntar'}</button>
                </span>
              </div>
              {open === c.id && <Tools c={c} all={list} onDone={(m) => { setMsg(m); setOpen(null); load(); }} />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Tools({ c, all, onDone }: { c: Community; all: Community[]; onDone: (msg: string) => void }) {
  const [name, setName] = useState(c.name);
  const [slug, setSlug] = useState(c.slug);
  const [into, setInto] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const target = all.find((x) => x.id === into);
  const rename = async () => {
    setBusy(true); setErr('');
    try { const n = await communityApi.adminRename(c.id, slug, name); onDone(`Pronto: agora é ${n.name} (w/${n.slug}).${n.slug !== c.slug ? ` O endereço w/${c.slug} continua levando para lá.` : ''}`); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const merge = async () => {
    if (!target) return;
    setBusy(true); setErr('');
    try { const r = await communityApi.adminMerge(c.id, target.id); onDone(`w/${c.slug} foi juntada a w/${target.slug}: ${r.moved} ${r.moved === 1 ? 'conversa mudou' : 'conversas mudaram'} de lugar, e o endereço antigo leva para lá.`); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const slugBad = slug !== c.slug && !slugOk(slug);
  return (
    <div className="st-comms__tools">
      <div className="cm-form">
        <span className="kicker">Renomear</span>
        <div className="club-form__row">
          <label className="cm-form__f"><span className="kicker">Nome</span><input className="field" value={name} maxLength={48} onChange={(e) => setName(e.target.value)} /></label>
          <label className="cm-form__f"><span className="kicker">Endereço</span><input className="field" value={slug} maxLength={32} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} aria-invalid={slugBad} /></label>
        </div>
        <div className="cm-form__acts"><button className="btn ghost sm" disabled={busy || slugBad || name.trim().length < 3 || (name === c.name && slug === c.slug)} onClick={() => void rename()}>Salvar nome e endereço</button></div>
      </div>
      <div className="cm-form">
        <span className="kicker">Juntar com outra</span>
        <label className="cm-form__f"><span className="kicker">w/{c.slug} vai para</span>
          <select className="field" value={into} onChange={(e) => { setInto(e.target.value); setSure(false); }}>
            <option value="">Escolha a comunidade que fica</option>
            {all.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>{x.name} (w/{x.slug})</option>)}
          </select>
        </label>
        {target && <p className="muted">As {c.posts} conversas, quem segue, as jogatinas e os clubes de w/{c.slug} passam para w/{target.slug}. w/{c.slug} deixa de existir e o endereço passa a levar para w/{target.slug}. Não dá para desfazer.</p>}
        <div className="cm-form__acts">
          {sure ? <><button className="btn danger-solid sm" disabled={busy} onClick={() => void merge()}>Juntar de vez</button><button className="btn quiet sm" onClick={() => setSure(false)}>Voltar</button></>
            : <button className="btn ghost sm" disabled={!target} onClick={() => setSure(true)}>Juntar</button>}
        </div>
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}
