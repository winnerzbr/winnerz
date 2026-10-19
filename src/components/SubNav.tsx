import { Link, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { FEATURES } from '../lib/features';

/** O menu principal mostra só os pilares; dentro de cada pilar, esta barra leva às partes dele. */
const SECTIONS: Record<string, { to: string; label: string; also?: string[]; adminOnly?: boolean }[]> = {
  colecao: [
    { to: '/colecao', label: 'Estante' },
    { to: '/colecao/consoles', label: 'Consoles' },
    { to: '/colecao/museu', label: 'Museu', also: ['/colecao/vitrines/'] },
    { to: '/colecao/desejos', label: 'Desejos' },
    { to: '/colecao/estatisticas', label: 'Estatísticas' },
    { to: '/colecao/importar', label: 'Importar', also: ['/colecao/steam'] },
  ],
  jornada: [
    { to: '/jornada', label: 'Em andamento' },
    { to: '/jornada/concluidas', label: 'Concluídas' },
    { to: '/jornada/linha-do-tempo', label: 'Linha do tempo' },
    { to: '/jornada/retrospectivas', label: 'Retrospectivas' },
  ],
  jogos: [
    { to: '/jogos', label: 'Buscar' },
    { to: '/jogos/explorar', label: 'Explorar' },
    { to: '/jogos/radar', label: 'Radar' },
    { to: '/jogos/trilhas', label: 'Trilhas', also: ['/jogos/trilhas/'], adminOnly: !FEATURES.trilhas },
  ],
};

export function SubNav({ pillar }: { pillar: keyof typeof SECTIONS }) {
  const path = usePath().split('?')[0].replace(/\/+$/, '') || '/';
  const isAdmin = useStore((s) => !!s.isAdmin);
  // Trilhas escondidas por enquanto (lib/features.ts): só a administração vê, para montar a primeira.
  const items = SECTIONS[pillar]?.filter((i) => !i.adminOnly || isAdmin);
  if (!items || items.length < 2) return null;
  return (
    <nav className="subnav" aria-label="Seções">
      {items.map((i) => <Link key={i.to} to={i.to} aria-current={path === i.to || i.also?.some((a) => (a.endsWith('/') ? path.startsWith(a) : path === a)) ? 'page' : undefined}>{i.label}</Link>)}
    </nav>
  );
}
