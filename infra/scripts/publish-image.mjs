import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { validateSpec, validateDeployId, imageReference } from './spec.mjs';

const directory = resolve(process.argv[2] || 'image');
const expectedSpec = validateSpec(JSON.parse(process.env.BUILD_SPEC || '{}'));
const expectedId = validateDeployId(process.env.DEPLOY_ID);
const image = imageReference(process.env.GHCR_NAMESPACE?.toLowerCase(), expectedSpec, expectedId);
const metadata = JSON.parse(readFileSync(join(directory, 'operation.json'), 'utf8'));
if (metadata.image !== image || metadata.deployId !== expectedId || JSON.stringify(validateSpec(metadata.spec)) !== JSON.stringify(expectedSpec)) throw new Error('Artefato não corresponde à operação esperada.');
function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Falha Docker na publicação.');
  return result.stdout;
}
const existing = spawnSync('docker', ['manifest', 'inspect', image], { encoding: 'utf8' });
if (existing.status === 0) throw new Error('Tag já existe; esta etapa não sobrescreve imagens publicadas.');
if (!/manifest unknown|no such manifest|name unknown/i.test(`${existing.stdout} ${existing.stderr}`)) throw new Error('Não foi possível confirmar que a tag está disponível.');
docker(['load', '--input', join(directory, 'image.tar')]);
const inspection = JSON.parse(docker(['image', 'inspect', image]))[0];
const labels = inspection.Config?.Labels;
if (labels?.['io.terabits.project'] !== expectedSpec.projectId || labels?.['io.terabits.deploy'] !== expectedId || labels?.['org.opencontainers.image.revision'] !== expectedSpec.sourceCommitSha) throw new Error('Labels da imagem não correspondem à operação.');
if (process.env.GITHUB_REPOSITORY && labels?.['org.opencontainers.image.source'] !== `https://github.com/${process.env.GITHUB_REPOSITORY}`) throw new Error('Imagem sem vínculo com o repositório central esperado.');
docker(['push', image]);
const digests = JSON.parse(docker(['image', 'inspect', image]))[0].RepoDigests || [];
const name = image.split(':')[0];
const reference = digests.find((value) => value.startsWith(`${name}@sha256:`) && /^[a-f0-9]{64}$/.test(value.split('@sha256:')[1]));
if (!reference) throw new Error('Digest de publicação não encontrado.');
const result = { image, reference, digest: reference.split('@')[1], deployId: expectedId, projectId: expectedSpec.projectId, sourceCommitSha: expectedSpec.sourceCommitSha };
writeFileSync(join(directory, 'result.json'), JSON.stringify(result, null, 2));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `reference=${reference}\ndigest=${result.digest}\n`);
console.info(JSON.stringify(result));
