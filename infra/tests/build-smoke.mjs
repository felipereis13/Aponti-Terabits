import { mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareContext } from '../scripts/prepare.mjs';

const directory = resolve('infra/.work', `build-${Date.now()}`);
mkdirSync(directory, { recursive: true });
const results = {};
function execute(args, log, expectedFailure = false) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 600000 });
  writeFileSync(join(directory, `${log}.log`), `${result.stdout || ''}\n${result.stderr || ''}`);
  if (result.error) throw result.error;
  if (expectedFailure ? result.status === 0 : result.status !== 0) throw new Error(`${log}: resultado inesperado; veja ${directory}.`);
  console.info(`${log}: ${expectedFailure ? 'falha esperada confirmada' : 'passou'}`);
}
const onlyCustom = process.argv.includes('--only-custom');
const cases = onlyCustom ? [] : [
  ['node', 'node-service', { buildCommand: 'node -e \'console.log("aspas preservadas")\' && test -z "$GITHUB_TOKEN"' }],
  ['static', 'vite-site', {}],
  ['bad-test', 'node-service', { testCommand: 'exit 7' }],
  ['bad-build', 'node-service', { buildCommand: 'exit 8' }],
];
for (const [name, example, override] of cases) {
  const spec = { ...JSON.parse(readFileSync(`infra/examples/${example}.build.json`, 'utf8')), ...override };
  const bundle = join(directory, name);
  prepareContext(`infra/examples/${example}`, bundle, spec);
  const imageOutput = join(directory, `${name}-image`);
  execute(['infra/scripts/build-image.mjs', bundle, imageOutput, 'terabits-lab', spec.projectId], name, name.startsWith('bad-'));
  if (!name.startsWith('bad-')) results[name] = imageOutput;
}
if (!onlyCustom) writeFileSync(resolve('infra/.work/build-results.json'), JSON.stringify(results, null, 2));
console.info('Imagens locais prontas. Nenhuma imagem foi publicada no registry.');

// Modo avançado usa um Dockerfile temporário, sem adicioná-lo aos exemplos de origem.
const customSource = join(directory, 'custom-source');
cpSync('infra/examples/node-service', customSource, { recursive: true });
writeFileSync(join(customSource, 'Customfile'), 'FROM node:24-alpine\nWORKDIR /app\nCOPY . .\nUSER node\nCMD ["node", "src/server.mjs"]\n');
const customSpec = {
  ...JSON.parse(readFileSync('infra/examples/node-service.build.json', 'utf8')),
  buildMode: 'DOCKERFILE', dockerfilePath: 'Customfile', testCommand: '', startCommand: '',
};
const customBundle = join(directory, 'custom');
prepareContext(customSource, customBundle, customSpec);
execute(['infra/scripts/build-image.mjs', customBundle, join(directory, 'custom-image'), 'terabits-lab', customSpec.projectId], 'custom-dockerfile');
