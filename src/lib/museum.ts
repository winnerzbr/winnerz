import type { HardwareKind, MuseumPiece, MuseumRoom, State } from '../data/types';
import { shortPlatform } from './platforms';

/** Como uma peça aparece na parede do Museu (o mesmo formato serve para o Museu aberto no perfil). */
export interface Exhibit {
  key: string;
  t: 'c' | 'h' | 'm' | 'f';
  title: string;
  /** Linha da plaquinha: plataforma e ano, ou jogo e data do momento. */
  sub?: string;
  cover?: string;
  img?: string;
  platform?: string;
  slug?: string;
  hwKind?: HardwareKind;
  quote?: string;
  caption?: string;
}

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Peça do Museu pronta para a parede. O que sumiu da coleção (ou da Jornada) fica de fora. */
export function exhibitOf(s: State, p: MuseumPiece): Exhibit | null {
  const caption = p.caption?.trim() || undefined;
  switch (p.t) {
    case 'c': {
      const c = s.copies.find((x) => x.id === p.id);
      const g = c ? s.games[c.gameId] : undefined;
      if (!c || !g) return null;
      return { key: `c-${p.id}`, t: 'c', title: g.title, sub: [shortPlatform(c.platform), g.year].filter(Boolean).join(' · '), cover: g.cover, platform: c.platform, slug: g.slug, caption };
    }
    case 'h': {
      const h = (s.hardware ?? []).find((x) => x.id === p.id);
      if (!h) return null;
      return { key: `h-${p.id}`, t: 'h', title: h.name, sub: [h.platform && shortPlatform(h.platform), h.model, h.edition].filter(Boolean).join(' · '), platform: h.platform, hwKind: h.kind, caption };
    }
    case 'm': {
      const e = s.events.find((x) => x.id === p.id);
      const j = e ? s.journeys.find((x) => x.id === e.journeyId) : undefined;
      const g = j ? s.games[j.gameId] : undefined;
      if (!e || !g) return null;
      return { key: `m-${p.id}`, t: 'm', title: e.title, sub: `${g.title} · ${e.dateLabel ?? day(e.at)}`, img: e.image, cover: g.cover, slug: g.slug, quote: e.quote, caption };
    }
    case 'f':
      if (!p.image) return null;
      return { key: `f-${p.id}`, t: 'f', title: '', img: p.image, caption };
  }
  return null;
}

export const roomExhibits = (s: State, r: MuseumRoom) => r.pieces.map((p) => exhibitOf(s, p)).filter((x): x is Exhibit => !!x);

/** Modelos de sala: um começo pronto, que você edita. "Sala livre" começa vazia. */
export interface RoomModel { key: string; title: string; text: string; pieces: (s: State) => MuseumPiece[] }

const GIFT = /ganhei|presente|herdei|herança|heranca/i;

export const ROOM_MODELS: RoomModel[] = [
  {
    key: 'especial', title: 'Especial para mim', text: 'As peças que eu não trocaria por nada.',
    pieces: (s) => s.copies.filter((c) => c.special && s.games[c.gameId]).slice(0, 8).map((c) => ({ t: 'c', id: c.id })),
  },
  {
    key: 'presentes', title: 'Presentes e heranças', text: 'O que chegou pelas mãos de alguém.',
    pieces: (s) => [
      ...(s.hardware ?? []).filter((h) => GIFT.test(h.origin ?? '')).map((h) => ({ t: 'h' as const, id: h.id })),
      ...s.copies.filter((c) => GIFT.test(c.origin ?? '') && s.games[c.gameId]).map((c) => ({ t: 'c' as const, id: c.id })),
    ].slice(0, 8),
  },
  {
    key: 'antigos', title: 'Os mais antigos da estante', text: 'Os jogos mais antigos que ainda estão aqui.',
    pieces: (s) => s.copies.filter((c) => s.games[c.gameId]?.year).sort((a, b) => (s.games[a.gameId].year ?? 9999) - (s.games[b.gameId].year ?? 9999)).slice(0, 6).map((c) => ({ t: 'c', id: c.id })),
  },
  {
    key: 'consoles', title: 'Os consoles da casa', text: 'Cada um marcou uma época.',
    pieces: (s) => (s.hardware ?? []).filter((h) => h.kind !== 'acessorio').slice(0, 8).map((h) => ({ t: 'h', id: h.id })),
  },
  {
    key: 'momentos', title: 'Momentos que guardei', text: 'Cenas que ficaram depois que a tela apagou.',
    pieces: (s) => s.events.filter((e) => e.kind === 'momento' && e.image).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map((e) => ({ t: 'm', id: e.id })),
  },
  { key: 'livre', title: 'Sala livre', text: '', pieces: () => [] },
];

/** O Museu sugerido para quem ainda não montou o seu: até quatro salas que a coleção já preenche. */
export function suggestedRooms(s: State): MuseumRoom[] {
  return ROOM_MODELS.filter((m) => m.key !== 'livre')
    .map((m, i) => ({ id: `sug-${m.key}`, position: i, title: m.title, text: m.text, pieces: m.pieces(s) }))
    .filter((r) => r.pieces.length > 0)
    .slice(0, 4);
}
