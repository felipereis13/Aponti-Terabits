import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('quando o site é preparado, a entrada HTML aponta para a aplicação React', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(html, /src="\/src\/main\.jsx"/);
  assert.match(source, /createRoot/);
  assert.match(source, /versão 1\.0\.0/);
});
