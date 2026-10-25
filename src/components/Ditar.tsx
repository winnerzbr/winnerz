/**
 * Ditar: um botão de microfone que escreve o que você fala (reconhecimento de voz do próprio navegador, em português).
 * Some quando o navegador não oferece (Firefox, por exemplo). Nada é gravado nem enviado pelo WinnerZ.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};
type RecCtor = new () => Rec;

const ctor = (): RecCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function Ditar({ onText, className = 'btn ghost icon' }: { onText: (text: string) => void; className?: string }) {
  const [on, setOn] = useState(false);
  const [aviso, setAviso] = useState('');
  const rec = useRef<Rec | null>(null);
  const C = ctor();
  useEffect(() => () => rec.current?.abort(), []);
  if (!C) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    setAviso('');
    const r = new C();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) { const t = res[0].transcript.trim(); if (t) onText(t.charAt(0).toUpperCase() + t.slice(1)); }
      }
    };
    r.onerror = (e) => setAviso(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'O microfone não foi liberado.' : e.error === 'no-speech' ? 'Não ouvi nada. Tente de novo.' : 'O ditado não funcionou agora.');
    r.onend = () => setOn(false);
    rec.current = r;
    try { r.start(); setOn(true); } catch { setAviso('O ditado não funcionou agora.'); }
  };
  return (
    <span className="ditar">
      <button type="button" className={`${className}${on ? ' is-on' : ''}`} aria-pressed={on} onClick={toggle} aria-label={on ? 'Parar de ditar' : 'Ditar o recado'} title={on ? 'Parar de ditar' : 'Ditar o recado'}>
        <Icon name={on ? 'parar' : 'mic'} size={20} />
      </button>
      <span className="ditar__msg" aria-live="polite">{on ? 'Ouvindo… toque de novo para parar' : aviso}</span>
    </span>
  );
}
