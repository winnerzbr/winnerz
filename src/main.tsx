import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initStore } from './data/store';
import { demoAdapter } from './data/demoAdapter';
import { SUPABASE_ON } from './lib/env';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';


async function boot() {
  if (SUPABASE_ON) {
    const { supabaseAdapter, getClient } = await import('./data/supabaseAdapter');
    await initStore(supabaseAdapter);
    const sb = await getClient();
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') initStore(supabaseAdapter);
    });
  } else {
    await initStore(demoAdapter);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
boot();
