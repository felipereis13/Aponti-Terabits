import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.mjs';

test('quando /health é consultado, responde com versão e mensagem de demonstração', async () => {
  const app = createApp();
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.version, '1.0.0');
    assert.equal(typeof body.message, 'string');
  } finally { await new Promise((resolve) => app.close(resolve)); }
});
