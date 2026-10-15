/**
 * Campo de convidar pelo @: digita o @ (ou escolhe entre quem você segue e quem segue você) e cada pessoa vira
 * uma etiqueta. Enter, espaço ou vírgula fecham o @ digitado.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { socialApi } from '../data/socialApi';
import { demoPersonRef } from '../data/communityApi';
import { PersonAvatar } from './Posts';
import { useMyHandle } from './Moderation';
import { Icon } from './Icon';

const HANDLE = /^[a-z0-9_.]{2,30}$/;
type Sug = { handle: string; avatar?: string | null; mutual: boolean };

export function InviteBox({ value, onChange, exclude = [], label = 'Convidar pelo @', max = 20 }: { value: string[]; onChange: (v: string[]) => void; exclude?: string[]; label?: string; max?: number }) {
  const mine = useMyHandle();
  const demo = useStore((s) => s.mode === 'demo');
  const myHandle = ((demo ? demoPersonRef('demo-me').handle : mine) ?? '').toLowerCase();
  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);
  const [pick, setPick] = useState(0);
  const [people, setPeople] = useState<Sug[]>([]);
  const [warn, setWarn] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    socialApi.people().then((p) => {
      if (!alive) return;
      const m = new Map<string, Sug>();
      [...p.following, ...p.followers].forEach((x) => { if (x.handle) { const k = x.handle.toLowerCase(); const prev = m.get(k); m.set(k, { handle: x.handle, avatar: x.avatar, mutual: x.mutual || !!prev?.mutual }); } });
      setPeople([...m.values()].sort((a, b) => Number(b.mutual) - Number(a.mutual) || a.handle.localeCompare(b.handle)));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const taken = useMemo(() => new Set([...value, ...exclude, myHandle].map((h) => h.toLowerCase())), [value, exclude, myHandle]);
  const q = text.trim().replace(/^@/, '').toLowerCase();
  const list = people.filter((p) => !taken.has(p.handle.toLowerCase()) && (!q || p.handle.toLowerCase().startsWith(q))).slice(0, 6);
  const add = (raw: string) => {
    const h = raw.trim().replace(/^@/, '').toLowerCase();
    setText(''); setPick(0);
    if (!h) return;
    if (!HANDLE.test(h)) { setWarn(`“${raw.trim()}” não parece um @.`); return; }
    if (h === myHandle) { setWarn('Você já está na jogatina.'); return; }
    if (taken.has(h)) return;
    if (value.length >= max) { setWarn(`No máximo ${max} pessoas por vez.`); return; }
    setWarn(''); onChange([...value, h]);
  };
  const remove = (h: string) => onChange(value.filter((x) => x !== h));
  return (
    <div className="invite-box">
      <div className={`invite-box__field field${focus ? ' is-focus' : ''}`} onClick={() => input.current?.focus()}>
        {value.map((h) => {
          const p = people.find((x) => x.handle.toLowerCase() === h);
          return (
            <span key={h} className="invite-chip">
              <PersonAvatar p={{ id: h, handle: h, avatar: p?.avatar ?? null }} size={20} />@{h}
              <button type="button" aria-label={`Tirar @${h}`} onClick={(e) => { e.stopPropagation(); remove(h); }}><Icon name="fechar" size={12} /></button>
            </span>
          );
        })}
        <input ref={input} value={text} aria-label={label} placeholder={value.length ? '' : '@ da pessoa'} autoComplete="off" autoCapitalize="none" spellCheck={false}
          onChange={(e) => { const v = e.target.value; if (/[\s,;]$/.test(v)) add(v.slice(0, -1)); else { setText(v); setPick(0); setWarn(''); } }}
          onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => { setFocus(false); if (text.trim()) add(text); }, 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (list.length && q && list[pick]) add(list[pick].handle); else add(text); }
            else if (e.key === 'ArrowDown' && list.length) { e.preventDefault(); setPick((i) => (i + 1) % list.length); }
            else if (e.key === 'ArrowUp' && list.length) { e.preventDefault(); setPick((i) => (i - 1 + list.length) % list.length); }
            else if (e.key === 'Backspace' && !text && value.length) remove(value[value.length - 1]);
          }} />
      </div>
      {focus && list.length > 0 && (
        <ul className="invite-box__sug" role="listbox" aria-label="Sugestões">
          {list.map((p, i) => (
            <li key={p.handle} role="option" aria-selected={i === pick}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); add(p.handle); input.current?.focus(); }}>
                <PersonAvatar p={{ id: p.handle, handle: p.handle, avatar: p.avatar }} size={24} /><span>@{p.handle}</span>{p.mutual && <small className="faint">amigo</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {warn && <small className="awards__error">{warn}</small>}
    </div>
  );
}

/** "Convite enviado para @a e @b. @c já estava na lista. Não achei @d." */
export function inviteSummary(r: { sent: string[]; already: string[]; notFound: string[] }): string {
  const join = (l: string[]) => { const x = l.map((h) => `@${h}`); return x.length > 1 ? `${x.slice(0, -1).join(', ')} e ${x[x.length - 1]}` : x[0]; };
  const bits: string[] = [];
  if (r.sent.length) bits.push(`${r.sent.length === 1 ? 'Convite enviado para' : 'Convites enviados para'} ${join(r.sent)}.`);
  if (r.already.length) bits.push(`${join(r.already)} já ${r.already.length === 1 ? 'estava' : 'estavam'} na lista.`);
  if (r.notFound.length) bits.push(`Não achei ${join(r.notFound)}.`);
  return bits.join(' ');
}
