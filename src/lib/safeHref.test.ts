import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeHref } from './safeHref';

test('links colados só abrem se forem endereços web normais', () => {
  assert.equal(safeHref('https://www.twitch.tv/winnerz'), 'https://www.twitch.tv/winnerz');
  assert.equal(safeHref('http://exemplo.com.br/a?b=1'), 'http://exemplo.com.br/a?b=1');
  assert.equal(safeHref('javascript:alert(1)'), undefined);
  assert.equal(safeHref('  JavaScript:alert(document.cookie)'), undefined);
  assert.equal(safeHref('data:text/html,<script>alert(1)</script>'), undefined);
  assert.equal(safeHref('vbscript:msgbox'), undefined);
  assert.equal(safeHref('/caminho/interno'), undefined);
  assert.equal(safeHref(''), undefined);
  assert.equal(safeHref(null), undefined);
});
