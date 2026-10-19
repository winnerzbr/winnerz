import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initStore, getState, actions } from './data/store';
import { demoAdapter } from './data/demoAdapter';
import { SUPABASE_ON } from './lib/env';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/etapa2.css';
import './styles/album.css';
import './styles/fresta.css';
import './styles/iamiguinho.css';
import './styles/finish.css';


async function boot() {
  if (SUPABASE_ON) {
    const { supabaseAdapter, getClient, moveLegacyPhotos } = await import('./data/supabaseAdapter');
    // Fotos antigas (gravadas dentro do banco) vão para o Storage em segundo plano.
    const afterLoad = () => {
      const st = getState();
      if (st.profile) moveLegacyPhotos(st.events, st.profile.id, (id, path) => actions.updateEventPhoto(id, { imagePath: path }));
    };
    await initStore(supabaseAdapter);
    afterLoad();
    const sb = await getClient();
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') initStore(supabaseAdapter).then(afterLoad);
    });
  } else {
    await initStore(demoAdapter);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
// Site instalável (PWA): só no site publicado, para o modo de desenvolvimento não guardar arquivos velhos.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => null); });
}
boot();
