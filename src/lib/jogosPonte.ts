/**
 * Ponte entre o site e o jogo IAmiguinho: Jogos de Verão (que roda num iframe, em /demo/jogos-verao/).
 * O jogo foi feito para a página do Claude, onde o editor guarda tudo pelo `window.claude.use('db')`.
 * Aqui a mesma conversa é atendida pelo Supabase: tabela `jogo_dados` (migração 0097) e pasta `jogos` do Storage.
 * Só a administração grava (regras no banco); todo mundo lê o que foi aplicado.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const JOGO_PASTA = 'verao/';
export const JOGO_BUCKET = 'jogos';

/** "wz/rascunho" -> "verao/wz/rascunho" (o caminho guardado na tabela). */
export function caminhoDoJogo(path: string): string {
  const limpo = String(path).replace(/^\/+|\/+$/g, '');
  if (!limpo || limpo.includes('..')) throw new TypeError('caminho inválido');
  return JOGO_PASTA + limpo;
}

/** Documentos que ficam direto dentro de uma coleção (sem os de subcoleções). */
export function filhosDiretos(colecao: string, caminhos: string[]): string[] {
  const base = caminhoDoJogo(colecao) + '/';
  return caminhos.filter((c) => c.startsWith(base) && !c.slice(base.length).includes('/'));
}

/** Nome seguro para uma imagem no Storage (só letras, números, - _ . e /). */
export function nomeDaImagem(nome: string): string {
  const partes = String(nome).split('/').map((p) => p.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/\.{2,}/g, '.')).filter((p) => p && p !== '.');
  const n = partes.join('/');
  return n.startsWith(JOGO_PASTA) ? n : JOGO_PASTA + n;
}

type Snap = { id: string; exists: boolean; data: () => Record<string, unknown> | undefined; metadata: { fromCache: boolean; hasPendingWrites: boolean } };
const snap = (id: string, dados: Record<string, unknown> | null): Snap => ({
  id, exists: !!dados, data: () => (dados ?? undefined), metadata: { fromCache: false, hasPendingWrites: false },
});
const erro = (e: unknown) => ({ code: 'unavailable', message: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) });

export function criaPonte(getClient: () => Promise<SupabaseClient>, ehAdmin: () => Promise<boolean>) {
  const docRef = (path: string) => {
    const c = caminhoDoJogo(path), id = c.split('/').pop() ?? '';
    const ref = {
      id, path,
      async get(): Promise<Snap> {
        const sb = await getClient();
        const { data, error } = await sb.from('jogo_dados').select('dados').eq('caminho', c).maybeSingle();
        if (error) throw erro(error);
        return snap(id, (data?.dados as Record<string, unknown>) ?? null);
      },
      async set(dados: Record<string, unknown>): Promise<void> {
        const sb = await getClient();
        const { error } = await sb.from('jogo_dados').upsert({ caminho: c, dados, atualizado: new Date().toISOString() });
        if (error) throw erro(error);
      },
      async update(dados: Record<string, unknown>): Promise<void> {
        const atual = await ref.get(); if (!atual.exists) throw { code: 'invalid_argument', message: 'documento não existe' };
        await ref.set({ ...(atual.data() ?? {}), ...dados });
      },
      async delete(): Promise<void> {
        const sb = await getClient();
        const { error } = await sb.from('jogo_dados').delete().eq('caminho', c);
        if (error) throw erro(error);
      },
      onSnapshot(next: (s: Snap) => void, falha?: (e: { code: string; message: string }) => void) {
        let vivo = true;
        ref.get().then((s) => { if (vivo) next(s); }).catch((e) => { if (vivo && falha) falha(erro(e)); });
        return () => { vivo = false; };
      },
    };
    return ref;
  };
  const colRef = (path: string) => ({
    path,
    doc: (id: string) => docRef(`${path}/${id}`),
    async get() {
      const sb = await getClient(), base = caminhoDoJogo(path) + '/';
      const { data, error } = await sb.from('jogo_dados').select('caminho, dados').like('caminho', `${base.replace(/[%_]/g, '\\$&')}%`);
      if (error) throw erro(error);
      const linhas = (data ?? []) as { caminho: string; dados: Record<string, unknown> }[];
      const ok = new Set(filhosDiretos(path, linhas.map((l) => l.caminho)));
      const docs = linhas.filter((l) => ok.has(l.caminho)).map((l) => snap(l.caminho.split('/').pop() ?? '', l.dados));
      return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false }, docChanges: () => [] };
    },
  });
  const db = { doc: docRef, collection: colRef };
  const user = {
    isOwner: ehAdmin, canEdit: ehAdmin,
    async can(o: string) { return o === 'data.write' ? ehAdmin() : false; },
    async id() { const sb = await getClient(); return (await sb.auth.getUser()).data.user?.id ?? null; },
  };
  // imagens pintadas no editor do jogo
  const imagens = {
    async envia(nome: string, blob: Blob): Promise<string> {
      const sb = await getClient(), n = nomeDaImagem(nome);
      const { error } = await sb.storage.from(JOGO_BUCKET).upload(n, blob, { contentType: blob.type || 'image/webp', upsert: true, cacheControl: '31536000' });
      if (error) throw erro(error);
      return sb.storage.from(JOGO_BUCKET).getPublicUrl(n).data.publicUrl;
    },
  };
  return {
    use: async (nome: string) => (nome === 'db' ? db : nome === 'user' ? user : nome === 'imagens' ? imagens : null),
  };
}
