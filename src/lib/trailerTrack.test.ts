import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScenesToTrack } from './trailerTrack';

const BAR = 240 / 135;
const sc = (...kinds: string[]) => kinds.map((kind) => ({ kind, dur: 3 }));

test('cenas no compasso: o corpo fecha em frases de 4 compassos', () => {
  for (const kinds of [['intro', 'stats', 'chapter', 'moment', 'end'], ['intro', 'stats', 'end'], ['intro', 'stats', 'chapter', 'chapter', 'chapter', 'moment', 'moment', 'people', 'end']]) {
    const out = fitScenesToTrack(sc(...kinds));
    const body = out.slice(1, -1).reduce((a, s) => a + s.dur, 0) / BAR;
    assert.ok(Math.abs(body - Math.round(body / 4) * 4) < 1e-6, `${kinds.join(',')}: ${body} compassos`);
    assert.ok(Math.abs(out[0].dur - 2 * BAR) < 1e-6);
    assert.ok(Math.abs(out.at(-1)!.dur - (4 * BAR + 0.7)) < 1e-6);
    out.slice(1, -1).forEach((s) => assert.ok(Math.abs((s.dur / (BAR / 2)) - Math.round(s.dur / (BAR / 2))) < 1e-6, 'cada cena em meios compassos'));
  }
  assert.equal(fitScenesToTrack(sc('intro', 'end')).length, 2);
});
