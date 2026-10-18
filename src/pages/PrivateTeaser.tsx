import { useEffect } from 'react';
import { BrandMark } from '../components/Brand';
import { Link } from '../lib/router';
import { pelaTelaInicial } from '../lib/appInstalado';

/**
 * Enquanto o site está fechado: o logo, a linha do horizonte e "Em breve". Nada mais. No app da tela inicial, que não
 * tem barra de endereço (e no iPhone começa sem a sessão do Safari), aparece também um "Entrar" discreto.
 */
export function PrivateTeaser() {
  useEffect(() => {
    const before = document.title;
    document.title = 'WinnerZ · Em breve';
    return () => { document.title = before; };
  }, []);
  return (
    <main className="teaser">
      <div className="teaser__glow" aria-hidden="true" />
      <div className="teaser__in">
        <BrandMark width={150} title="WinnerZ" className="teaser__mark" />
        <div className="teaser__horizon" aria-hidden="true"><span /></div>
        <p className="teaser__soon">Em breve</p>
        {pelaTelaInicial() && <Link to="/entrar" className="teaser__entrar">Entrar</Link>}
      </div>
    </main>
  );
}
