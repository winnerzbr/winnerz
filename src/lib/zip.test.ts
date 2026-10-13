import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, makeZip } from './zip';

test('crc32 confere com o valor conhecido', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('zip tem assinatura, entradas e fim de diretório', async () => {
  const blob = makeZip([{ name: 'a.txt', data: 'olá' }, { name: 'fotos/b.bin', data: new Uint8Array([1, 2, 3]) }]);
  const b = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(b.buffer);
  assert.equal(dv.getUint32(0, true), 0x04034b50);
  assert.equal(dv.getUint32(b.length - 22, true), 0x06054b50);
  assert.equal(dv.getUint16(b.length - 22 + 10, true), 2);
});
