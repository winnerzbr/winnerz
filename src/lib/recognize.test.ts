import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTitle, eanValid, matchPlatform, normalizeCode, platformFromText, knownPlatform } from './recognize';

test('dígito verificador e formato do código', () => {
  assert.equal(eanValid('7891234567895'), true);
  assert.equal(eanValid('7891234567894'), false);
  assert.equal(eanValid('711719541028'), true); // UPC-A
  assert.equal(eanValid('96385074'), true); // EAN-8
  assert.equal(normalizeCode('7 11719 54102 8'), '0711719541028');
  assert.equal(normalizeCode('00711719541028'), '0711719541028');
  assert.equal(normalizeCode('123'), null);
  assert.equal(normalizeCode('7891234567894'), null);
});

test('plataforma no nome do produto', () => {
  assert.equal(platformFromText("Marvel's Spider-Man - PlayStation 4"), 'PlayStation 4');
  assert.equal(platformFromText('Jogo Zelda Tears of the Kingdom Nintendo Switch Mídia Física'), 'Nintendo Switch');
  assert.equal(platformFromText('Mario Kart World - Switch 2'), 'Nintendo Switch 2');
  assert.equal(platformFromText('Halo Infinite (Xbox Series X)'), 'Xbox Series X|S');
  assert.equal(platformFromText('God of War PS-4'), 'PlayStation 4');
  assert.equal(platformFromText('Lords of the Fallen'), undefined);
  assert.equal(platformFromText('Dark Souls'), undefined);
});

test('nome do jogo sem o ruído do produto', () => {
  assert.equal(cleanTitle("Marvel's Spider-Man - PlayStation 4"), "Marvel's Spider-Man");
  assert.equal(cleanTitle('Jogo The Legend of Zelda: Tears of the Kingdom - Nintendo Switch - Mídia Física'), 'The Legend of Zelda: Tears of the Kingdom');
  assert.equal(cleanTitle('Uncharted 4: A Thief’s End (PS4) [Lacrado]'), 'Uncharted 4: A Thief’s End');
  assert.equal(cleanTitle('Sony God of War Ragnarok Standard Edition PS5'), 'God of War Ragnarok');
  assert.equal(cleanTitle('Halo 3 Xbox 360 NTSC Original'), 'Halo 3');
  assert.equal(cleanTitle('Game of Thrones'), 'Game of Thrones');
});

test('plataforma entre as do jogo', () => {
  const plats = ['PlayStation 4', 'PC (Microsoft Windows)', 'PlayStation 5'];
  assert.equal(matchPlatform('PS4', plats), 'PlayStation 4');
  assert.equal(matchPlatform('PlayStation 5', plats), 'PlayStation 5');
  assert.equal(matchPlatform('Switch', plats), undefined);
  assert.equal(matchPlatform('', plats), undefined);
  assert.equal(knownPlatform('ps2'), 'PlayStation 2');
  assert.equal(knownPlatform('Atari Jaguar'), undefined);
});
