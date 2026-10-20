/**
 * Etapa 4b da live: o microfone da cabine do sofá, para o "Ô iamiguinho!". Usa o reconhecimento de voz do próprio
 * navegador (no Chrome, o áudio vai para o serviço de voz do Google e volta como texto; nada passa pelo site). Fica
 * ouvindo direto: o navegador para sozinho de tempos em tempos e aqui ele é religado.
 */
export type EstadoMic = 'ouvindo' | 'sem-suporte' | 'sem-permissao' | 'erro';

type Resultado = { isFinal: boolean; 0: { transcript: string } };
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Resultado> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; onstart: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
const construtor = (): (new () => Rec) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const suportaMic = () => !!construtor();

/** Liga o microfone. onFrase recebe o texto (final = a frase acabou). Devolve a função que desliga. */
export function ouvirMic(onFrase: (texto: string, final: boolean) => void, onEstado: (e: EstadoMic) => void): () => void {
  const R = construtor();
  if (!R) { onEstado('sem-suporte'); return () => {}; }
  let fechado = false, rec: Rec | null = null, falhas = 0;
  const abrir = () => {
    if (fechado) return;
    rec = new R();
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onstart = () => { falhas = 0; onEstado('ouvindo'); };
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript?.trim();
        if (t) onFrase(t, r.isFinal);
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { fechado = true; onEstado('sem-permissao'); }
      else if (e.error !== 'no-speech' && e.error !== 'aborted') { falhas++; if (falhas > 5) onEstado('erro'); }
    };
    // O navegador encerra a escuta depois de um tempo: liga de novo (com uma pausa maior se estiver falhando).
    rec.onend = () => { if (!fechado) setTimeout(abrir, Math.min(5000, 250 * 2 ** Math.min(falhas, 4))); };
    try { rec.start(); } catch { setTimeout(abrir, 1000); }
  };
  abrir();
  return () => { fechado = true; try { rec?.abort(); } catch { /* já parou */ } };
}
