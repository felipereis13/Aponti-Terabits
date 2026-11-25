import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateSpec, validateDeployId, imageReference } from '../scripts/spec.mjs';
import { prepareContext } from '../scripts/prepare.mjs';
import { extractArchive } from '../scripts/archive.mjs';

const spec = { projectId: '11111111-1111-4111-8111-111111111111', repository: 'example/app', sourceCommitSha: 'a'.repeat(40), buildMode: 'NODE_SERVICE' };
function fixture(t) {
  const parent = realpathSync(tmpdir());
  const directory = mkdtempSync(join(parent, 'terabits-generator-'));
  const source = join(directory, 'source');
  mkdirSync(source);
  writeFileSync(join(source, 'package.json'), '{"name":"fixture","version":"1.0.0"}');
  writeFileSync(join(source, 'package-lock.json'), '{"name":"fixture","lockfileVersion":3,"packages":{}}');
  t.after(() => {
    if (dirname(realpathSync(directory)) !== parent) throw new Error('Limpeza fora do diretório temporário recusada.');
    rmSync(directory, { recursive: true, force: true });
  });
  return { directory, source, output: join(directory, 'bundle') };
}

test('quando a origem Node não tem Dockerfile/workflow, gera configuração sem executar comandos no host', (t) => {
  const { source, output, directory } = fixture(t);
  const marker = join(directory, 'should-not-exist');
  const buildCommand = `node -e 'console.log("aspas e $HOME")' && touch "${marker}"`;
  prepareContext(source, output, { ...spec, buildCommand });
  assert.equal(existsSync(marker), false);
  assert.equal(JSON.parse(readFileSync(join(output, 'trusted/spec.json'))).buildCommand, buildCommand);
  assert.equal(readFileSync(join(output, 'Dockerfile'), 'utf8').includes(buildCommand), false);
  assert.equal(existsSync(join(source, 'Dockerfile')), false);
});

test('quando o modo é estático, gera Nginx sem startCommand e sem workflow na origem', (t) => {
  const { source, output } = fixture(t);
  prepareContext(source, output, { ...spec, buildMode: 'STATIC_SITE' });
  const result = JSON.parse(readFileSync(join(output, 'trusted/spec.json')));
  assert.equal(result.internalPort, 8080);
  assert.equal(result.healthPath, '/');
  assert.match(readFileSync(join(output, 'Dockerfile'), 'utf8'), /nginx-unprivileged/);
});

test('quando o modo é Dockerfile, usa somente o arquivo explicitamente escolhido', (t) => {
  const { source, output } = fixture(t);
  writeFileSync(join(source, 'Customfile'), 'FROM scratch\n');
  prepareContext(source, output, { ...spec, buildMode: 'DOCKERFILE', dockerfilePath: 'Customfile', internalPort: 9000 });
  assert.equal(existsSync(join(output, 'Dockerfile')), false);
  assert.equal(readFileSync(join(output, 'source/Customfile'), 'utf8'), 'FROM scratch\n');
});

test('quando há segredos/credenciais ou .dockerignore, eles não entram no contexto', (t) => {
  const { source, output } = fixture(t);
  for (const name of ['.env', '.env.production', '.npmrc', 'private.pem', 'debug.log']) writeFileSync(join(source, name), 'DO_NOT_COPY');
  writeFileSync(join(source, '.dockerignore'), '*.log\n');
  mkdirSync(join(source, 'trusted'));
  writeFileSync(join(source, 'trusted/build.mjs'), 'untrusted source file');
  prepareContext(source, output, spec);
  for (const name of ['.env', '.env.production', '.npmrc', 'private.pem', 'debug.log']) assert.equal(existsSync(join(output, 'source', name)), false);
  assert.notEqual(readFileSync(join(output, 'trusted/build.mjs'), 'utf8'), 'untrusted source file');
});

test('quando package-lock está ausente, falha em vez de instalar silenciosamente', (t) => {
  const { source, output } = fixture(t);
  rmSync(join(source, 'package-lock.json'));
  assert.throws(() => prepareContext(source, output, spec), /package-lock/);
});

test('quando .dockerignore remove manifesto obrigatório, recusa contexto', (t) => {
  const { source, output } = fixture(t);
  writeFileSync(join(source, '.dockerignore'), 'package-lock.json\n');
  assert.throws(() => prepareContext(source, output, spec), /obrigatório/);
});

test('quando caminhos escapam da origem ou comandos contêm quebra de linha, recusa', () => {
  for (const rootDirectory of ['../outside', '/tmp/app', 'C:/app', '..\\outside', 'app/../outside', '.. /outside', 'app/NUL.txt']) assert.throws(() => validateSpec({ ...spec, rootDirectory }));
  assert.throws(() => validateSpec({ ...spec, buildCommand: 'npm test\nCOPY /etc /app' }));
  assert.throws(() => validateSpec({ ...spec, buildMode: 'STATIC_SITE', publishDirectory: '../outside' }));
  assert.throws(() => validateSpec({ ...spec, buildMode: 'DOCKERFILE', dockerfilePath: '/etc/passwd', internalPort: 3000 }));
});

test('quando existe link para fora da origem, recusa em vez de seguir o alvo', (t) => {
  const { source, output, directory } = fixture(t);
  const external = join(directory, 'external');
  mkdirSync(external);
  symlinkSync(external, join(source, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => prepareContext(source, output, spec), /link/i);
});

test('quando a saída está dentro da origem ou já existe, não sobrescreve arquivos', (t) => {
  const { source, output } = fixture(t);
  assert.throws(() => prepareContext(source, join(source, 'bundle'), spec), /fora/);
  mkdirSync(output);
  writeFileSync(join(output, 'keep'), 'preserve');
  assert.throws(() => prepareContext(source, output, spec), /já existe/);
  assert.equal(readFileSync(join(output, 'keep'), 'utf8'), 'preserve');
});

test('quando a identidade, SHA, namespace ou modo são inválidos, recusa', () => {
  assert.throws(() => validateSpec({ ...spec, sourceCommitSha: 'main' }));
  assert.throws(() => validateSpec({ ...spec, repository: 'https://evil.example/app' }));
  assert.throws(() => validateSpec({ ...spec, env: { TOKEN: 'secret' } }));
  assert.throws(() => validateSpec({ ...spec, buildMode: 'STATIC_SITE', startCommand: 'npm start' }));
  assert.throws(() => validateDeployId('id\ncommand'));
  assert.throws(() => imageReference('../escape', spec, spec.projectId));
  assert.match(imageReference('terabits', spec, spec.projectId), /^ghcr.io\/terabits\/app-/);
});

test('quando metadados de publicação pertencem a outra operação, recusa antes de carregar ou publicar imagem', (t) => {
  const { directory } = fixture(t);
  writeFileSync(join(directory, 'operation.json'), JSON.stringify({ image: 'ghcr.io/other/app:other', deployId: spec.projectId, spec }));
  const script = fileURLToPath(new URL('../scripts/publish-image.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, directory], {
    encoding: 'utf8', env: { ...process.env, BUILD_SPEC: JSON.stringify(spec), DEPLOY_ID: spec.projectId, GHCR_NAMESPACE: 'terabits' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Artefato não corresponde/);
  assert.equal(existsSync(join(directory, 'result.json')), false);
});

function archiveEntry(name, type = '0', content = 'hello') {
  const body = Buffer.from(content);
  const header = Buffer.alloc(512);
  header.write(name, 0, 100);
  header.write('0000644\0', 100);
  header.write(body.length.toString(8).padStart(11, '0') + '\0', 124);
  header.fill(32, 148, 156);
  header.write(type, 156);
  const sum = header.reduce((total, byte) => total + byte, 0);
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return Buffer.concat([header, body, Buffer.alloc((512 - body.length % 512) % 512)]);
}

test('quando o archive contém arquivo regular seguro, extrai sem executar conteúdo', (t) => {
  const { directory } = fixture(t);
  const target = join(directory, 'extract');
  mkdirSync(target);
  extractArchive(gzipSync(archiveEntry('repo-sha/package.json', '0', '{}')), target);
  assert.equal(readFileSync(join(target, 'package.json'), 'utf8'), '{}');
});

test('quando o archive contém traversal, link ou duplicata, rejeita', (t) => {
  const { directory } = fixture(t);
  for (const [index, entries] of [
    [archiveEntry('repo/../escape')], [archiveEntry('repo/link', '2')],
    [archiveEntry('repo/file'), archiveEntry('repo/file')],
  ].entries()) {
    const target = join(directory, `extract-${index}`);
    mkdirSync(target);
    assert.throws(() => extractArchive(gzipSync(Buffer.concat(entries)), target));
  }
});
