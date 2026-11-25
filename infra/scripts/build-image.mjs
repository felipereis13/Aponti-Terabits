import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { validateSpec, validateDeployId, imageReference, GENERATOR_VERSION } from './spec.mjs';

const [, , bundleArg, outputArg, namespaceArg, deployArg] = process.argv;
if (!bundleArg || !outputArg || !namespaceArg || !deployArg) throw new Error('Uso: build-image.mjs <bundle> <saída> <namespace> <deploy UUID>');
const bundle = resolve(bundleArg);
const spec = validateSpec(JSON.parse(readFileSync(join(bundle, 'trusted/spec.json'), 'utf8')));
const deployId = validateDeployId(deployArg);
const image = imageReference(namespaceArg, spec, deployId);
const centralRepository = process.env.GITHUB_REPOSITORY;
if (centralRepository && !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(centralRepository)) throw new Error('Repositório central inválido.');
const output = resolve(outputArg);
mkdirSync(output, { recursive: true });
function docker(args) {
  const result = spawnSync('docker', args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Comando Docker falhou.');
}
const context = spec.buildMode === 'DOCKERFILE' ? join(bundle, 'source') : bundle;
const dockerfile = spec.buildMode === 'DOCKERFILE' ? join(context, spec.dockerfilePath) : join(bundle, 'Dockerfile');
docker(['build', '--pull', '--network=default', '--file', dockerfile, '--tag', image,
  '--label', `io.terabits.project=${spec.projectId}`, '--label', `io.terabits.deploy=${deployId}`,
  '--label', `org.opencontainers.image.revision=${spec.sourceCommitSha}`, '--label', `io.terabits.generator=${GENERATOR_VERSION}`,
  ...(centralRepository ? ['--label', `org.opencontainers.image.source=https://github.com/${centralRepository}`] : []), context]);
docker(['save', '--output', join(output, 'image.tar'), image]);
writeFileSync(join(output, 'operation.json'), JSON.stringify({ deployId, image, spec, generatorVersion: GENERATOR_VERSION }, null, 2));
