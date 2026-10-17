import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoSeconds, tsLines, videoRows } from '../../api/retomada';

test('duração do YouTube em segundos', () => {
  assert.equal(isoSeconds('PT1H2M3S'), 3723);
  assert.equal(isoSeconds('PT45M'), 2700);
  assert.equal(isoSeconds('P1DT1S'), 86401);
  assert.equal(isoSeconds('x'), 0);
});

test('marcações de tempo da descrição, em ordem', () => {
  const d = 'Detonado completo!\n0:00 Intro\n12:34 - Capítulo 1: Jackson\n(1:02:03) Seattle Dia 1\n1:00:00 volta no tempo (ignora)\nlink https://x.y/12:30\n1:30:00 — Teatro';
  assert.deepEqual(tsLines(d), [
    { s: 0, label: 'Intro' }, { s: 754, label: 'Capítulo 1: Jackson' }, { s: 3723, label: 'Seattle Dia 1' }, { s: 5400, label: 'Teatro' },
  ]);
  assert.deepEqual(tsLines(undefined), []);
});

test('resposta da IA: só vídeos dos candidatos, itens da lista e minutos da descrição', () => {
  const cands = {
    pt: [{ key: 'P1', kind: 'pl' as const, id: 'PLx', title: 'Detonado', channel: 'Canal', items: [{ videoId: 'aaaaaaaaaaa', title: 'Parte 1 - Jackson' }, { videoId: 'bbbbbbbbbbb', title: 'Parte 2 - Seattle' }] }],
    en: [{ key: 'V1', kind: 'v' as const, id: 'ccccccccccc', title: 'Full', channel: 'C', seconds: 7200, ts: [{ s: 0, label: 'Jackson' }, { s: 754, label: 'Seattle' }, { s: 3723, label: 'Theater' }] }],
  };
  const rows = videoRows({
    pt: { source: 'P1', map: [{ n: 1, item: 1 }, { n: 2, item: 2 }, { n: 3, item: 9 }, { n: 1, item: 2 }] },
    en: { source: 'V1', map: [{ n: 1, t: '0:00' }, { n: 2, t: '12:34' }, { n: 3, t: '50:00' }, { n: 9, t: '1:02:03' }] },
  }, cands, ['j', 's', 't']);
  assert.deepEqual(rows, [
    { partId: 'j', lang: 'pt', videoId: 'aaaaaaaaaaa', start: 0 },
    { partId: 's', lang: 'pt', videoId: 'bbbbbbbbbbb', start: 0 },
    { partId: 'j', lang: 'en', videoId: 'ccccccccccc', start: 0 },
    { partId: 's', lang: 'en', videoId: 'ccccccccccc', start: 754 },
  ]);
  assert.deepEqual(videoRows({ pt: { source: 'P9', map: [{ n: 1, item: 1 }] } }, cands, ['j']), []);
  assert.deepEqual(videoRows(null, cands, ['j']), []);
});

import { titleMatches } from '../../api/retomada';
test('título do vídeo precisa falar do item', () => {
  assert.equal(titleMatches('Godrick the Grafted', 'ELDEN RING PLATINA #5 - MEIO-LOBO BLAIDD AMIGO E PATCHES'), false);
  assert.equal(titleMatches('Godrick the Grafted', 'Elden Ring #6 - Godrick, o Enxertado (chefe)'), true);
  assert.equal(titleMatches('Liurnia of the Lakes', 'ELDEN RING #9 - Chegando em Liurnia dos Lagos'), true);
  assert.equal(titleMatches('Seattle, dia 2', 'The Last of Us 2 - Seattle Day 2 - Part 7'), true);
  assert.equal(titleMatches('Seattle, dia 2', 'The Last of Us 2 - Seattle Day 1'), false);
  assert.equal(titleMatches('Rennala, Queen of the Full Moon', 'Rennala Boss Fight'), true);
  assert.equal(titleMatches('Jackson', 'Part 1'), false);
});

test('IA pode ligar cada item a um candidato diferente', () => {
  const cands = {
    pt: [],
    en: [
      { key: 'P1', kind: 'pl' as const, id: 'PLx', title: 'Walkthrough', channel: 'C', items: [{ videoId: 'aaaaaaaaaaa', title: 'Elden Ring - Limgrave Exploration' }] },
      { key: 'V1', kind: 'v' as const, id: 'bbbbbbbbbbb', title: 'All Bosses', channel: 'C', seconds: 9000, ts: [{ s: 0, label: 'Margit, the Fell Omen' }, { s: 600, label: 'Godrick the Grafted' }, { s: 1200, label: 'Rennala' }] },
    ],
  };
  const rows = videoRows({ en: [{ n: 1, source: 'P1', item: 1 }, { n: 2, source: 'V1', t: '10:00' }, { n: 3, source: 'V1', t: '0:00' }] }, cands,
    [{ id: 'l', name: 'Limgrave' }, { id: 'g', name: 'Godrick the Grafted' }, { id: 's', name: 'Stormveil Castle' }]);
  assert.deepEqual(rows, [
    { partId: 'l', lang: 'en', videoId: 'aaaaaaaaaaa', start: 0 },
    { partId: 'g', lang: 'en', videoId: 'bbbbbbbbbbb', start: 600 },
  ]);
});
