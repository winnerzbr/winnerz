/**
 * IAmiguinho M5: as respostas dele quando alguém chama @iamiguinho na Comunidade (migração 0072) e as aparições
 * públicas do perfil. Quem decide e escreve é a /api/iamiguinho; aqui o site só pede, lê e tira do ar.
 * Na demonstração, a resposta sai da biblioteca e fica só neste navegador.
 */
import { getState } from './store';
import { mentionsOf } from '../lib/postText';
import { respostaDaBiblioteca } from '../lib/iamiguinhoFalas';

export type MascoteResposta = { id: string; origem: 'post' | 'resposta'; origemId: string; body: string; createdAt: string; canRemove: boolean };
export type Aparicao = { id: string; postId: string; title: string; place: string; body: string; createdAt: string; anchor?: string | null };

const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';

/** O texto sem as citações ("> ..."): citar quem chamou o mascote não é chamar de novo. */
export const semCitacao = (texto: string) => texto.split('\n').filter((l) => !/^\s*>/.test(l)).join('\n');
/** A pessoa chamou o mascote neste texto (fora das citações)? */
export const chamouIamiguinho = (texto: string) => mentionsOf(semCitacao(texto)).some((h) => h.toLowerCase() === 'iamiguinho');

/* ---- Demonstração: guardado só neste navegador ---- */
const KEY = 'wz.iamiguinho.respostas';
type Demo = MascoteResposta & { postId: string; title: string; place: string };
function lerDemo(): Demo[] { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function gravarDemo(l: Demo[]) { try { localStorage.setItem(KEY, JSON.stringify(l.slice(-60))); } catch { /* tudo bem */ } }

export const iamiguinhoApi = {
  /** As respostas dele numa conversa (as mesmas regras de visibilidade da conversa). */
  async fio(postId: string): Promise<MascoteResposta[]> {
    if (!supa()) return lerDemo().filter((x) => x.postId === postId);
    const r = await (await client()).rpc('iamiguinho_fio', { p_post: postId });
    return r.error ? [] : ((r.data as MascoteResposta[] | null) ?? []);
  },
  /**
   * Pede a resposta a uma menção. O servidor confere tudo de novo (quem escreveu, o lugar, denúncia, modo, tetos).
   * Devolve a resposta publicada, ou null quando ele não responde.
   */
  async chamar(origem: 'post' | 'resposta', id: string, texto: string, onde: { postId: string; title: string; place: string }): Promise<MascoteResposta | null> {
    if (!chamouIamiguinho(texto)) return null;
    if ((getState().prefs.iamiguinho ?? 'normal') === 'desativado') return null;
    if (!supa()) {
      const l = lerDemo();
      if (l.some((x) => x.origem === origem && x.origemId === id)) return null;
      const r: Demo = { id: `iam-${Date.now()}`, origem, origemId: id, body: respostaDaBiblioteca(semCitacao(texto)), createdAt: new Date().toISOString(), canRemove: true, ...onde };
      gravarDemo([...l, r]);
      return r;
    }
    try {
      const { accessToken } = await import('./supabaseAdapter');
      const token = await accessToken();
      if (!token) return null;
      const r = await fetch('/api/iamiguinho', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: 'mencao', origem, id, epoca: (await import('../lib/iamiguinho')).epocaAtual() }) });
      if (!r.ok) return null;
      const j = (await r.json()) as { respondeu?: boolean; resposta?: MascoteResposta };
      return j.respondeu && j.resposta ? j.resposta : null;
    } catch { return null; }
  },
  /** Quem chamou, a moderação ou a administração tiram a resposta dele do ar. */
  async tirar(id: string): Promise<void> {
    if (!supa()) { gravarDemo(lerDemo().filter((x) => x.id !== id)); return; }
    const r = await (await client()).rpc('iamiguinho_tirar', { p_id: id });
    if (r.error) throw new Error('Não deu para tirar a resposta agora.');
  },
  /** "Aparições públicas" do perfil @iamiguinho. */
  async aparicoes(): Promise<Aparicao[]> {
    if (!supa()) return lerDemo().slice().reverse().slice(0, 12).map((x) => ({ id: x.id, postId: x.postId, title: x.title, place: x.place, body: x.body, createdAt: x.createdAt, anchor: x.origem === 'resposta' ? `r-${x.origemId}` : null }));
    const r = await (await client()).rpc('iamiguinho_aparicoes', { p_limit: 12 });
    return r.error ? [] : ((r.data as Aparicao[] | null) ?? []);
  },
};
