import { actions, useStore } from '../data/store';
import { Stars } from '../components/Stars';
import { darkTokens } from '../lib/theme';
import { formatScore, normalize, scaleMax } from '../lib/rating';
import { SUPABASE_ON } from '../lib/env';
import { resetDemo } from '../data/demoAdapter';

const SAMPLES = [
  { who: 'Uma nota 9,5 de 0 a 10', r: normalize(9.5, 'TEN_POINT') },
  { who: 'Uma nota de 4,5 estrelas', r: normalize(4.5, 'FIVE_STAR') },
  { who: 'Uma nota 8,5 de 0 a 10', r: normalize(8.5, 'TEN_POINT') },
];

export function Preferences() {
  const prefs = useStore((s) => s.prefs);
  const profile = useStore((s) => s.profile);
  const preview = darkTokens(prefs.black);

  const signOut = async () => {
    const { getClient } = await import('../data/supabaseAdapter');
    await (await getClient()).auth.signOut();
  };

  return (
    <main className="page pad prefs">
      <p className="muted">Preferências{profile ? ` de ${profile.name}` : ''}</p>
      <h1 className="t big">Aparência e notas</h1>
      <p className="muted lead">Vale para todos os seus aparelhos. A página muda na hora para você ver o resultado.</p>

      <section aria-labelledby="tema" className="prefs__section">
        <h2 id="tema" className="t">Tema</h2>
        <div className="themes">
          <button className="theme-card" aria-pressed={prefs.theme === 'escuro'} onClick={() => actions.setPrefs({ theme: 'escuro' })}>
            <span className="theme-card__mini" aria-hidden="true" style={{ background: preview['--bg'] }}>
              <span style={{ background: '#EEE5D5', width: '50%' }} /><span style={{ background: '#5A544C', width: '70%' }} />
              <span className="theme-card__blocks"><i style={{ background: preview['--surface'] }} /><i style={{ background: preview['--surface'] }} /><b /></span>
            </span>
            Escuro
          </button>
          <button className="theme-card" aria-pressed={prefs.theme === 'claro'} onClick={() => actions.setPrefs({ theme: 'claro' })}>
            <span className="theme-card__mini theme-card__mini--light" aria-hidden="true">
              <span style={{ background: '#1C1813', width: '50%' }} /><span style={{ background: '#C8BCA8', width: '70%' }} />
              <span className="theme-card__blocks"><i style={{ background: '#FFFDF9' }} /><i style={{ background: '#FFFDF9' }} /><b /></span>
            </span>
            Claro
          </button>
        </div>
        {prefs.theme === 'escuro' && (
          <div className="card black-card">
            <label htmlFor="preto" className="black-card__label">Intensidade do preto <span className="t">{prefs.black}%</span></label>
            <input id="preto" className="range lg" type="range" min={0} max={100} value={prefs.black} style={{ ['--p' as string]: `${prefs.black}%` }} onChange={(e) => actions.setPrefs({ black: Number(e.target.value) })} />
            <div className="black-card__ends"><span>Grafite, mais suave</span><span>Preto absoluto, ideal para telas OLED</span></div>
          </div>
        )}
      </section>

      <section aria-labelledby="notas" className="prefs__section">
        <h2 id="notas" className="t">Escala das notas</h2>
        <p className="muted prefs__p">A nota pertence a quem avaliou; a escala pertence a quem está vendo. Nada é arredondado: uma nota 8,5 aparece como 4,25 estrelas, com a estrela preenchida na medida certa.</p>
        <div className="seg" role="group" aria-label="Escala das notas">
          <button aria-pressed={prefs.scale === 'TEN_POINT'} onClick={() => actions.setPrefs({ scale: 'TEN_POINT' })}>De 0 a 10</button>
          <button aria-pressed={prefs.scale === 'FIVE_STAR'} onClick={() => actions.setPrefs({ scale: 'FIVE_STAR' })}>5 estrelas</button>
        </div>
        <ul className="samples">
          {SAMPLES.map((x) => (
            <li key={x.who}>
              <span>{x.who}</span>
              {prefs.scale === 'FIVE_STAR' && <Stars normalized={x.r.normalized} size={20} />}
              <span className="t">{formatScore(x.r.normalized, prefs.scale)}<span className="muted">/{scaleMax(prefs.scale)}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mov" className="prefs__section">
        <h2 id="mov" className="t">Animações</h2>
        <div role="radiogroup" aria-labelledby="mov" className="motions">
          {([
            ['completas', 'Completas', 'Celebrações, energia ao favoritar, linha do tempo cinematográfica.'],
            ['discretas', 'Discretas', 'Só confirmações curtas. Celebrações sem partículas.'],
            ['reduzidas', 'Reduzidas', 'Sem movimento: trocas instantâneas. Também vale quando o sistema pede menos movimento.'],
          ] as const).map(([id, label, desc]) => (
            <label key={id} className="motion" data-on={prefs.motion === id}>
              <input type="radio" name="mov" checked={prefs.motion === id} onChange={() => actions.setPrefs({ motion: id })} />
              <span><strong>{label}</strong><span className="muted">{desc}</span></span>
            </label>
          ))}
        </div>
      </section>

      <section className="prefs__section">
        <h2 className="t">Conta</h2>
        {SUPABASE_ON ? (
          profile ? <button className="btn ghost" onClick={signOut}>Sair da conta</button> : <a className="btn primary" href="/entrar">Entrar</a>
        ) : (
          <p className="muted prefs__p">Você está no modo demonstração: tudo fica neste navegador. <button className="btn quiet sm" onClick={resetDemo}>Recomeçar a demonstração</button></p>
        )}
      </section>
    </main>
  );
}
