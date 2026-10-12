import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Id desta versão do site (o commit, na Vercel). Vai para o código e para /version.json.
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 12) || String(Date.now());

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wz-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) });
      },
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 5173 },
});
