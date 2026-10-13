import { useEffect } from 'react';
import { BrandMark } from '../components/Brand';

/** Enquanto o site está fechado: o logo, a linha do horizonte e "Em breve". Nada mais. */
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
      </div>
    </main>
  );
}
