import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { validateSpec, validateDeployId, imageReference } from './spec.mjs';
import { extractArchive } from './archive.mjs';
import { prepareContext } from './prepare.mjs';

const spec = validateSpec(JSON.parse(process.env.BUILD_SPEC || '{}'));
const deployId = validateDeployId(process.env.DEPLOY_ID);
const namespace = process.env.GHCR_NAMESPACE?.toLowerCase();
const image = imageReference(namespace, spec, deployId);
const output = resolve(process.argv[2] || 'infra/.work/fetch');
mkdirSync(resolve(output, '..'), { recursive: true });
mkdirSync(output, { recursive: false });
const response = await fetch(`https://api.github.com/repos/${spec.repository}`, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/vnd.github+json' } });
if (!response.ok) throw new Error('Repositório público indisponível.');
const repository = await response.json();
if (repository.private !== false || repository.full_name?.toLowerCase() !== spec.repository.toLowerCase()) throw new Error('Protótipo permite somente repositório público exato, sem redirecionamento de identidade.');
const archive = await fetch(`https://codeload.github.com/${spec.repository}/tar.gz/${spec.sourceCommitSha}`, { signal: AbortSignal.timeout(120000) });
if (!archive.ok) throw new Error('Commit de origem não disponível.');
const chunks = [];
let size = 0;
for await (const chunk of archive.body) {
  size += chunk.length;
  if (size > 50 * 1024 * 1024) { await archive.body.cancel().catch(() => {}); throw new Error('Archive excede 50 MiB.'); }
  chunks.push(chunk);
}
const source = join(output, 'repository');
mkdirSync(source);
extractArchive(Buffer.concat(chunks), source);
prepareContext(source, join(output, 'bundle'), spec);
const metadata = { deployId, image, spec };
writeFileSync(join(output, 'bundle/operation.json'), JSON.stringify(metadata, null, 2));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `image=${image}\ndeploy_id=${deployId}\n`);
console.info('Fonte pública preparada no SHA informado; nenhum script da aplicação foi executado.');
