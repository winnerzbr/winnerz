import { Link, usePath } from '../lib/router';

/** O menu principal mostra só os pilares; dentro de cada pilar, esta barra leva às partes dele. */
const SECTIONS: Record<string, { to: string; label: string }[]> = {
  colecao: [
    { to: '/colecao', label: 'Estante' },
    { to: '/colecao/desejos', label: 'Desejos' },
    { to: '/colecao/estatisticas', label: 'Estatísticas' },
    { to: '/colecao/importar', label: 'Importar planilha' },
  ],
  jornada: [
    { to: '/jornada', label: 'Em andamento' },
    { to: '/jornada/concluidas', label: 'Histórias concluídas' },
  ],
  jogos: [
    { to: '/jogos', label: 'Buscar' },
  ],
};

export function SubNav({ pillar }: { pillar: keyof typeof SECTIONS }) {
  const path = usePath().split('?')[0].replace(/\/+$/, '') || '/';
  const items = SECTIONS[pillar];
  if (!items || items.length < 2) return null;
  return (
    <nav className="subnav" aria-label="Seções">
      {items.map((i) => <Link key={i.to} to={i.to} aria-current={path === i.to ? 'page' : undefined}>{i.label}</Link>)}
    </nav>
  );
}
