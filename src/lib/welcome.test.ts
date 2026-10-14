import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewcomer, lifeLine, markedGames, spread, stepsDone, SUN_X } from './welcome';
import type { Game, State } from '../data/types';

const g = (id: string, year?: number): Game => ({ id, slug: id, title: id, cover: '', platforms: [], year });
const base = { prefs: { theme: 'escuro', black: 70, scale: 'TEN_POINT', motion: 'completas' }, copies: [], wishes: [], journeys: [], histories: [] } as unknown as State;

test('conta jogos diferentes entre estante, desejos e Jornadas', () => {
  const s = { ...base, copies: [{ id: 'c1', gameId: 'a' }, { id: 'c2', gameId: 'a' }], wishes: [{ gameId: 'b' }], journeys: [{ id: 'j', gameId: 'a' }] } as unknown as State;
  assert.equal(markedGames(s), 2);
});

test('boas-vindas: some com Jornada em andamento, com muitos jogos ou quando a pessoa dispensa', () => {
  assert.equal(isNewcomer(base), true);
  assert.equal(isNewcomer({ ...base, prefs: { ...base.prefs, welcomeDone: true } }), false);
  const playing = { ...base, journeys: [{ id: 'j', gameId: 'a' }], histories: [{ id: 'h', journeyId: 'j', state: 'ativa' }] } as unknown as State;
  assert.equal(isNewcomer(playing), false);
  const finished = { ...base, journeys: [{ id: 'j', gameId: 'a' }], histories: [{ id: 'h', journeyId: 'j', state: 'concluida' }] } as unknown as State;
  assert.equal(isNewcomer(finished), true);
  const many = { ...base, copies: Array.from({ length: 12 }, (_, i) => ({ id: 'c' + i, gameId: 'g' + i })) } as unknown as State;
  assert.equal(isNewcomer(many), false);
});

test('spread mantém a ordem, a distância mínima e os limites', () => {
  assert.deepEqual(spread([], 0, 10, 2), []);
  assert.deepEqual(spread([5, 5, 5], 0, 100, 4), [5, 9, 13]);
  assert.deepEqual(spread([98, 99], 0, 100, 4), [96, 100]);
  const tight = spread([1, 1, 1, 1], 0, 6, 4);
  assert.deepEqual(tight, [0, 2, 4, 6]);
});

test('linha da vida: zerados por ano no passado, estante antes do sol, desejos depois', () => {
  const placed = lifeLine([
    { game: g('novo', 2020), kind: 'zerado' },
    { game: g('velho', 1994), kind: 'zerado' },
    { game: g('estante', 2022), kind: 'tenho', at: '2026-10-01' },
    { game: g('quero', 2026), kind: 'quero', at: '2026-10-02' },
  ], { thisYear: 2026 });
  const x = Object.fromEntries(placed.map((p) => [p.game.id, p.x]));
  assert.ok(x.velho < x.novo);
  assert.ok(x.novo < x.estante && x.estante < SUN_X);
  assert.ok(x.quero > SUN_X);
});

test('linha da vida guarda só os zerados mais novos quando passa do limite', () => {
  const placed = lifeLine(Array.from({ length: 9 }, (_, i) => ({ game: g('z' + i, 1990 + i * 3), kind: 'zerado' as const })), { thisYear: 2026, maxPast: 4 });
  assert.deepEqual(placed.map((p) => p.game.id), ['z5', 'z6', 'z7', 'z8']);
});

test('primeiros passos', () => {
  assert.deepEqual(stepsDone({ marked: 3, sessions: 0, top: 3, avatar: false }), [true, false, true, false]);
});
