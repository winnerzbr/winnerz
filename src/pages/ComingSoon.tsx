import { Link } from '../lib/router';

const COPY: Record<string, { lead: string; items: string[] }> = {
  Comunidade: {
    lead: 'O Lobby, as comunidades w/tema, as jogatinas e as Jornadas em dupla chegam na próxima etapa.',
    items: ['Feed e discussões no mesmo lugar', 'Proteção de spoiler pelo seu progresso', 'Jornada em dupla, cada um no seu ritmo'],
  },
  Eventos: {
    lead: 'WinnerZ Awards, o álbum de figurinhas, os códigos das lives e “Eu estava lá” chegam na próxima etapa.',
    items: ['Votação do Awards com regras claras', 'Álbum com pacotes e quatro raridades', 'Códigos de figurinha nas lives e nos vídeos'],
  },
};

export function ComingSoon({ pillar }: { pillar: 'Comunidade' | 'Eventos' }) {
  const c = COPY[pillar];
  return (
    <main className="page pad narrow">
      <h1 className="t big">{pillar}</h1>
      <p className="lead muted">{c.lead}</p>
      <ul className="soon">{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
      <Link className="btn primary" to="/jornada">Enquanto isso, abrir sua Jornada</Link>
    </main>
  );
}
