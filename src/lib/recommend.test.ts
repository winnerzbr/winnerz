import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, tasteProfile, daySeed } from './recommend';

const g = (id: string, more: any = {}) => ({ id, slug: id, title: id, cover: '', platforms: [], ...more });
const now = Date.parse('2026-10-15T21:00:00-03:00');
const st: any = {
  prefs: {}, favorites: ['hades'], wishes: [{ gameId: 'celeste' }], loans: [],
  games: {
    hades: g('hades', { title: 'Hades', genres: 'Role-playing (RPG), Indie', developer: 'Supergiant Games', modes: ['Single player'] }),
    pyre: g('pyre', { title: 'Pyre', genres: 'Role-playing (RPG), Sport', developer: 'Supergiant Games', modes: ['Single player'], ttb: { n: 10 } }),
    celeste: g('celeste', { title: 'Celeste', genres: 'Platform, Indie', modes: ['Single player'], ttb: { n: 8 } }),
    tekken: g('tekken', { title: 'Tekken 8', genres: 'Fighting', modes: ['Multiplayer'], ttb: { n: 6 } }),
    sim: g('sim', { title: 'Cities', genres: 'Simulator, Strategy', ttb: { n: 60 } }),
    tlou: g('tlou', { title: 'The Last of Us', genres: 'Adventure, Shooter', themes: ['Drama'], ttb: { n: 15 } }),
  },
  journeys: [{ id: 'jh', gameId: 'hades' }, { id: 'jt', gameId: 'tlou' }],
  histories: [
    { id: 'hh', journeyId: 'jh', ordinal: 1, state: 'concluida', startedAt: '2026-01-01T12:00:00-03:00' },
    { id: 'ht', journeyId: 'jt', ordinal: 1, state: 'ativa', startedAt: '2026-09-01T12:00:00-03:00', progress: 85 },
  ],
  sessions: [
    { id: 's1', journeyId: 'jt', historyId: 'ht', startedAt: '2026-10-01T20:00:00-03:00', endedAt: '2026-10-01T21:00:00-03:00', minutes: 60, feeling: 'Adorei', note: 'Entrar no teatro' },
  ],
  copies: [
    { id: 'c1', gameId: 'pyre', platform: 'PlayStation 5', kind: 'digital', purchasedOn: '2026-10-10' },
    { id: 'c2', gameId: 'celeste', platform: 'PlayStation 5', kind: 'digital', purchasedOn: '2021-03-01' },
    { id: 'c3', gameId: 'tekken', platform: 'PlayStation 5', kind: 'fisico' },
    { id: 'c4', gameId: 'sim', platform: 'PC', kind: 'digital' },
    { id: 'c5', gameId: 'tlou', platform: 'PlayStation 5', kind: 'fisico' },
  ],
  myGames: { celeste: { gameId: 'celeste', priority: 1 } },
  reviews: [],
};

test('perfil de gosto sai do que foi zerado e favoritado', () => {
  const t = tasteProfile(st);
  assert.ok((t.tags.get('RPG') ?? 0) > 0);
  assert.equal(t.studios.get('supergiant games')?.game, 'Hades');
  assert.ok(t.finished.has('hades'));
});

test('motivos cruzam gosto, estúdio, catalogação e andamento', () => {
  const ideas = recommend(st, 'surpresa', { now, hist: {}, seed: 7 });
  const by = Object.fromEntries(ideas.map((i) => [i.game.id, i]));
  assert.ok(by.pyre.why.some((w) => /Supergiant|estúdio/.test(w.text)), 'pyre: estúdio');
  assert.ok(by.pyre.why.some((w) => /Chegou há/.test(w.text)), 'pyre: chegada');
  assert.ok(by.celeste.why.some((w) => /desejo/.test(w.text)), 'celeste: desejo');
  assert.ok(by.celeste.why.some((w) => /prioridade alta/.test(w.text)), 'celeste: prioridade');
  assert.ok(by.tlou.why.some((w) => /Faltam só 15%/.test(w.text)), 'tlou: quase');
  assert.ok(by.tlou.why.some((w) => /Adorei/.test(w.text)), 'tlou: sentimento');
  assert.ok(!('hades' in by), 'zerado não entra');
});

test('filtros restringem e ordenam; o pulado perde peso', () => {
  const ids = (m: any, hist: any = {}) => recommend(st, m, { now, hist, seed: 3 }).map((i) => i.game.id);
  assert.ok(!ids('alguem').includes('pyre') && ids('alguem').includes('tekken'));
  assert.deepEqual(ids('historia').sort(), ['pyre', 'tlou']);
  assert.ok(ids('desafio').includes('tekken') && ids('desafio').includes('sim'));
  assert.ok(ids('pouco').indexOf('sim') > ids('pouco').indexOf('tekken'));
  const novel = recommend(st, 'diferente', { now, hist: {}, seed: 3 });
  assert.ok(novel.every((i) => i.why.some((w) => /Diferente do que/.test(w.text))));
  const first = ids('noite')[0];
  assert.notEqual(ids('noite', { [first]: { skipped: 3, last: '2026-10-14' } })[0], first);
  assert.equal(daySeed(now), daySeed(now + 3600000));
  assert.notEqual(daySeed(now), daySeed(now + 86400000));
});
