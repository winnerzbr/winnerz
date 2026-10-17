import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byParts, partPositions, type TLItem } from './chapters';
import type { OutlinePart } from './outline';
import type { Session, TimelineEvent } from '../data/types';

const parts: OutlinePart[] = [
  { id: 'a', name: 'Jackson', pct: 0 }, { id: 'b', name: 'Seattle 1', pct: 15 }, { id: 'c', name: 'Seattle 2', pct: 40 },
  { id: 'd', name: 'Teatro', pct: 60 }, { id: 'e', name: 'Fim', pct: 90, spoiler: true },
];
const ev = (id: string, at: string, sessionId?: string): TimelineEvent => ({ id, journeyId: 'j', historyId: 'h', kind: sessionId ? 'sessao' : 'momento', at, title: id, ...(sessionId ? { sessionId } : {}) } as TimelineEvent);
const it = (e: TimelineEvent, session?: Session): TLItem => ({ type: 'event', id: e.id, e, session, chapter: 1 });

test('Por capítulo: cada registro no capítulo em que você estava; à frente depois do Hoje', () => {
  const s3 = { id: 's3', journeyId: 'j', historyId: 'h', startedAt: '2026-10-02T10:00:00Z', partMarks: { from: { id: 'c', name: 'Seattle 2' } } } as Session;
  const items: TLItem[] = [
    it(ev('e0', '2026-09-01T10:00:00Z')),
    it(ev('e1', '2026-09-21T10:00:00Z', 's1')),
    it(ev('e2', '2026-09-27T10:00:00Z', 's2')),
    { type: 'silence', id: 'sil', days: 9, from: '2026-09-27T10:00:00Z', to: '2026-10-02T10:00:00Z', meanwhile: [], chapter: 1 },
    it(ev('e3', '2026-10-02T10:00:00Z', 's3'), s3),
    { type: 'today', id: 'hoje' },
  ];
  const log = [{ id: 'a', at: '2026-09-20T00:00:00Z' }, { id: 'b', at: '2026-09-26T00:00:00Z' }];
  const out = byParts(items, { parts, log, cur: parts[2], sessionOf: () => undefined });
  assert.deepEqual(out.map((x) => x.id), ['po-antes', 'e0', 'po-a', 'e1', 'po-b', 'e2', 'po-c', 'sil', 'e3', 'hoje', 'gp-d', 'gp-e']);
  const c = out.find((x) => x.id === 'po-c');
  assert.equal(c?.type === 'popen' && c.state, 'atual');
  const pos = partPositions(out, parts, 46);
  assert.equal(pos.get('po-c'), 40);
  assert.equal(pos.get('hoje'), 46);
  assert.equal(pos.get('gp-d'), 60);
  assert.ok((pos.get('e1') ?? 0) > 0 && (pos.get('e1') ?? 0) < 15);
});

test('Por capítulo: sem nenhuma marca, tudo fica no capítulo atual', () => {
  const out = byParts([it(ev('x', '2026-09-01T10:00:00Z')), { type: 'today', id: 'hoje' }], { parts, log: [], cur: parts[1], sessionOf: () => undefined });
  assert.deepEqual(out.map((x) => x.id), ['po-a', 'po-b', 'x', 'hoje', 'gp-c', 'gp-d', 'gp-e']);
});
