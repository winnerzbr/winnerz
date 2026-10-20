/**
 * Modo TV · Estante: as capas em fileiras, como a loja de um console. Jogando, Na estante (ainda sem Jornada ou
 * parados) e Zerados. Escolher uma capa leva ao Continuar com aquele jogo, para começar dali.
 */
import { useMemo } from 'react';
import { navigate } from '../lib/router';
import { currentHistory, journeyForGame, useStore } from '../data/store';
import type { Game } from '../data/types';

type Fileira = { titulo: string; jogos: { g: Game; selo: string }[] };

export function TvShelf() {
  const s = useStore((x) => x);
  const fileiras = useMemo<Fileira[]>(() => {
    const estado = (g: Game) => { const j = journeyForGame(s, g.id); return j ? currentHistory(s, j.id)?.state ?? null : null; };
    const vistos = new Set<string>();
    const jogando: Fileira['jogos'] = [], zerados: Fileira['jogos'] = [], estante: Fileira['jogos'] = [];
    for (const j of s.journeys) {
      const g = s.games[j.gameId]; if (!g || vistos.has(g.id)) continue;
      const st = currentHistory(s, j.id)?.state;
      if (st === 'ativa' || st === 'pausada') { jogando.push({ g, selo: st === 'pausada' ? 'Pausado' : 'Jogando' }); vistos.add(g.id); }
      else if (st === 'concluida') { zerados.push({ g, selo: 'Zerado' }); vistos.add(g.id); }
    }
    for (const c of s.copies) {
      const g = s.games[c.gameId]; if (!g || vistos.has(g.id)) continue;
      const st = estado(g);
      estante.push({ g, selo: st === 'dropada' || st === 'encerrada' ? 'Parado' : st ? '' : 'Nunca jogado' }); vistos.add(g.id);
    }
    const ord = (a: { g: Game }, b: { g: Game }) => a.g.title.localeCompare(b.g.title, 'pt-BR');
    return [
      { titulo: 'Jogando', jogos: jogando },
      { titulo: 'Na estante', jogos: estante.sort(ord) },
      { titulo: 'Zerados', jogos: zerados.sort(ord) },
    ].filter((f) => f.jogos.length);
  }, [s]);

  if (!fileiras.length) return <section className="tvs"><h1 className="tvs__t">Estante vazia</h1><p className="muted">Adicione jogos à coleção pelo site e eles aparecem aqui.</p></section>;
  return (
    <section className="tvs">
      <h1 className="tvs__t">Estante</h1>
      {fileiras.map((f, i) => (
        <div key={f.titulo} className="tvs__fileira">
          <h2 className="tvs__ft">{f.titulo} <span>{f.jogos.length}</span></h2>
          <div className="tvs__capas">
            {f.jogos.map(({ g, selo }, k) => (
              <button key={g.id} className="tvs__capa" data-tv-primeiro={i === 0 && k === 0 ? '' : undefined} onClick={() => navigate(`/tv?jogo=${encodeURIComponent(g.id)}`)}>
                {g.cover ? <img src={g.cover} alt="" loading="lazy" /> : <span className="tvs__sem">{g.title}</span>}
                <span className="tvs__nome">{g.title}</span>
                {selo && <span className="tvs__selo">{selo}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
