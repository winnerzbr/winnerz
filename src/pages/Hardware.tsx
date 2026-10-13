import { useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore } from '../data/store';
import type { Hardware, HardwareKind } from '../data/types';
import { SubNav } from '../components/SubNav';
import { Sheet, ConfirmButton } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { PLATFORM_NAMES, canonicalPlatform, platformRank, shortPlatform } from '../lib/platforms';

const KINDS: { k: HardwareKind; label: string; plural: string }[] = [
  { k: 'console', label: 'Console', plural: 'Consoles' },
  { k: 'portatil', label: 'Portátil', plural: 'Portáteis' },
  { k: 'acessorio', label: 'Acessório', plural: 'Acessórios' },
];
const CONDITIONS = ['Lacrado', 'Novo', 'Muito bom', 'Bom', 'Regular', 'Com defeito'];
const money = (n?: number) => (n == null ? '' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const dateBR = (d?: string) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '') : '');

/** Tom da plataforma (mesma família, mesmo tom), para o cartão ter cara própria sem foto. */
function hueOf(p?: string) {
  const c = canonicalPlatform(p ?? '');
  if (/PlayStation|PSP|Vita/.test(c)) return 220;
  if (/Xbox/.test(c)) return 130;
  if (/Nintendo|Wii|Game Boy|NES|SNES|GameCube|3DS|DS/.test(c)) return 0;
  if (/PC/.test(c)) return 270;
  return 32;
}

function KindIcon({ k }: { k: HardwareKind }) {
  const d = k === 'acessorio'
    ? <><path d="M6 9.5h4M8 7.5v4M15.5 9.5h.01M17.5 11.5h.01" /><path d="M7 5.5h10a4 4 0 0 1 4 3.6l.8 5.9a2.6 2.6 0 0 1-4.6 2l-1.9-2.2H8.7L6.8 17a2.6 2.6 0 0 1-4.6-2l.8-5.9A4 4 0 0 1 7 5.5z" /></>
    : k === 'portatil'
      ? <><rect x="2.5" y="6" width="19" height="12" rx="3" /><rect x="7" y="8.5" width="10" height="7" rx="1" /></>
      : <><rect x="3" y="7" width="18" height="10" rx="2" /><path d="M7 12h3M14.5 12h2.5" /></>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

/** Coleção → Consoles: consoles, portáteis e acessórios, cada um com sua ficha. */
export function HardwarePage() {
  const s = useStore((x) => x);
  const [open, setOpen] = useState<string | 'novo' | null>(null);
  const list = s.hardware ?? [];
  const groups = useMemo(() => KINDS.map((k) => ({ ...k, items: list.filter((h) => h.kind === k.k).sort((a, b) => platformRank(a.platform ?? '') - platformRank(b.platform ?? '') || a.name.localeCompare(b.name, 'pt-BR')) })).filter((g) => g.items.length), [list]);
  const gamesOn = (p?: string) => (p ? s.copies.filter((c) => canonicalPlatform(c.platform) === canonicalPlatform(p)).length : 0);
  const v14 = s.mode === 'demo' || !!s.schemaV14;

  return (
    <main className="page pad hwpage">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Consoles</h1>
          <p className="muted lead">{list.length ? <><span className="lead__strong">{list.length} {list.length === 1 ? 'item' : 'itens'}</span>: consoles, portáteis e acessórios, cada um com a sua ficha.</> : 'Os aparelhos da sua coleção: consoles, portáteis e acessórios, cada um com a sua ficha.'}</p>
        </div>
        <div className="page-head__side">
          <div className="collection__tools">
            <button className="btn primary" onClick={() => setOpen('novo')} disabled={!v14}><Icon name="mais" size={16} />Adicionar</button>
          </div>
          <SubNav pillar="colecao" />
        </div>
      </header>

      {!v14 && <div className="card tl-empty"><p className="muted">Para guardar consoles e acessórios, rode a migração 0014 no Supabase (SQL Editor → colar → Run).</p></div>}

      {v14 && !list.length && (
        <button className="hw-empty" onClick={() => setOpen('novo')}>
          <KindIcon k="console" />
          <b>Cadastre o primeiro console</b>
          <span>Modelo, edição, estado, o que veio junto e de onde veio. Tudo opcional, menos o nome.</span>
        </button>
      )}

      {groups.map((g) => (
        <section key={g.k} className="hwsec" aria-labelledby={`hw-${g.k}`}>
          <h2 id={`hw-${g.k}`} className="kicker hwsec__h">{g.plural} <span>{g.items.length}</span></h2>
          <ul className="hwgrid">
            {g.items.map((h) => (
              <li key={h.id}>
                <button className="hwcard" style={{ ['--h' as string]: hueOf(h.platform) }} onClick={() => setOpen(h.id)}>
                  <span className="hwcard__top"><span className="hwcard__icon"><KindIcon k={h.kind} /></span>{h.platform && <span className="hwcard__plat">{shortPlatform(h.platform)}</span>}</span>
                  <span className="t hwcard__name">{h.name}</span>
                  <span className="hwcard__meta">{[h.model, h.edition].filter(Boolean).join(' · ') || ' '}</span>
                  <span className="hwcard__foot">{h.condition && <span className="hwcard__cond">{h.condition}</span>}{h.kind !== 'acessorio' && gamesOn(h.platform) > 0 && <span>{gamesOn(h.platform)} {gamesOn(h.platform) === 1 ? 'jogo' : 'jogos'} na estante</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {open === 'novo' && <HardwareSheet onClose={() => setOpen(null)} />}
      {open && open !== 'novo' && <HardwareSheet hw={list.find((h) => h.id === open)} onClose={() => setOpen(null)} />}
    </main>
  );
}

function HardwareSheet({ hw, onClose }: { hw?: Hardware; onClose: () => void }) {
  const s = useStore((x) => x);
  const [editing, setEditing] = useState(!hw);
  if (hw && !editing) {
    const n = s.copies.filter((c) => hw.platform && canonicalPlatform(c.platform) === canonicalPlatform(hw.platform)).length;
    const rows: [string, string | undefined][] = [
      ['Tipo', KINDS.find((k) => k.k === hw.kind)?.label], ['Plataforma', hw.platform], ['Modelo', hw.model], ['Edição ou cor', hw.edition], ['Região', hw.region],
      ['Estado', hw.condition], ['O que veio junto', hw.items], ['Número de série', hw.serial], ['Como chegou', hw.origin],
      ['Comprado em', dateBR(hw.purchasedOn)], ['Onde', hw.purchasePlace], ['Valor pago', money(hw.pricePaid)],
    ];
    return (
      <Sheet title={hw.name} onClose={onClose} labelId="hw-t" wide>
        <dl className="hwdl">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {hw.note && <p className="hwnote">{hw.note}</p>}
        <div className="sheet__actions">
          <button className="btn ghost" onClick={() => setEditing(true)}>Editar ficha</button>
          {n > 0 && hw.kind !== 'acessorio' && <Link className="btn quiet" to={`/colecao?plataforma=${encodeURIComponent(canonicalPlatform(hw.platform!))}`} onClick={onClose}>{n === 1 ? `Ver o jogo de ${shortPlatform(hw.platform!)}` : `Ver os ${n} jogos de ${shortPlatform(hw.platform!)}`}</Link>}
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title={hw ? `Editar: ${hw.name}` : 'Novo console ou acessório'} onClose={onClose} labelId="hw-t" wide>
      <HardwareForm hw={hw} onDone={() => (hw ? setEditing(false) : onClose())} onDeleted={onClose} />
    </Sheet>
  );
}

function HardwareForm({ hw, onDone, onDeleted }: { hw?: Hardware; onDone: () => void; onDeleted: () => void }) {
  const [f, setF] = useState({
    kind: hw?.kind ?? 'console' as HardwareKind, name: hw?.name ?? '', platform: hw?.platform ?? '', model: hw?.model ?? '', edition: hw?.edition ?? '',
    region: hw?.region ?? '', condition: hw?.condition ?? '', items: hw?.items ?? '', serial: hw?.serial ?? '', origin: hw?.origin ?? '',
    purchasedOn: hw?.purchasedOn ?? '', purchasePlace: hw?.purchasePlace ?? '', pricePaid: hw?.pricePaid != null ? String(hw.pricePaid).replace('.', ',') : '', note: hw?.note ?? '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const txt = (v: string) => v.trim() || undefined;
  const num = (v: string) => { const n = Number(v.replace(/\./g, '').replace(',', '.')); return v.trim() && isFinite(n) ? n : undefined; };
  const save = () => {
    if (!f.name.trim()) return;
    const data = {
      kind: f.kind, name: f.name.trim(), platform: txt(f.platform), model: txt(f.model), edition: txt(f.edition), region: txt(f.region), condition: txt(f.condition),
      items: txt(f.items), serial: txt(f.serial), origin: txt(f.origin), purchasedOn: txt(f.purchasedOn), purchasePlace: txt(f.purchasePlace), pricePaid: num(f.pricePaid), note: txt(f.note),
    };
    if (hw) actions.updateHardware({ ...hw, ...data }); else actions.addHardware(data);
    onDone();
  };
  // Ao escolher a plataforma de um console novo sem nome, o nome vem junto.
  const pickPlatform = (e: { target: { value: string } }) => setF((x) => ({ ...x, platform: e.target.value, name: x.name || (x.kind !== 'acessorio' ? e.target.value : x.name) }));
  return (
    <form className="cform" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="seg hwform__kind" role="group" aria-label="Tipo">
        {KINDS.map((k) => <button type="button" key={k.k} aria-pressed={f.kind === k.k} onClick={() => setF((x) => ({ ...x, kind: k.k }))}>{k.label}</button>)}
      </div>
      <div className="cform__grid">
        <label>Plataforma<select className="field" value={f.platform} onChange={pickPlatform}><option value="">—</option>{PLATFORM_NAMES.map((p) => <option key={p} value={p}>{shortPlatform(p)}</option>)}</select></label>
        <label>Nome<input className="field" value={f.name} onChange={set('name')} required placeholder={f.kind === 'acessorio' ? 'Ex.: DualSense Edge' : 'Ex.: PlayStation 2'} /></label>
        <label>Modelo<input className="field" value={f.model} onChange={set('model')} placeholder="Ex.: SCPH-39001" /></label>
        <label>Edição ou cor<input className="field" value={f.edition} onChange={set('edition')} placeholder="Ex.: Slim, Edição God of War" /></label>
        <label>Região<input className="field" value={f.region} onChange={set('region')} placeholder="Ex.: BR, US, JP" /></label>
        <label>Estado<input className="field" value={f.condition} onChange={set('condition')} list="hwconds" /></label>
        <label className="cform__wide">O que veio junto<input className="field" value={f.items} onChange={set('items')} placeholder="Ex.: caixa, 2 controles, cabos, manual" /></label>
        <label>Número de série<input className="field" value={f.serial} onChange={set('serial')} /></label>
        <label>Como chegou<input className="field" value={f.origin} onChange={set('origin')} placeholder="Ex.: presente de Natal, 2002" /></label>
        <label>Data da compra<input className="field" type="date" value={f.purchasedOn} onChange={set('purchasedOn')} /></label>
        <label>Onde comprou<input className="field" value={f.purchasePlace} onChange={set('purchasePlace')} /></label>
        <label>Valor pago (R$)<input className="field" inputMode="decimal" value={f.pricePaid} onChange={set('pricePaid')} /></label>
        <label className="cform__wide">Nota só sua<textarea className="field" rows={2} value={f.note} onChange={set('note')} /></label>
      </div>
      <datalist id="hwconds">{CONDITIONS.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="sheet__actions">
        <button type="submit" className="btn primary lg" disabled={!f.name.trim()}>{hw ? 'Salvar' : 'Adicionar'}</button>
        <button type="button" className="btn quiet" onClick={onDone}>Cancelar</button>
      </div>
      {hw && (
        <div className="sheet__danger">
          <ConfirmButton label="Mover para a lixeira" confirm="Toque de novo para mover" onConfirm={() => { actions.deleteHardware(hw.id); onDeleted(); }} />
          <p className="faint">Fica 30 dias na lixeira da Coleção e volta com um toque.</p>
        </div>
      )}
    </form>
  );
}
