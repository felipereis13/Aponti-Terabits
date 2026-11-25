export const GENERATOR_VERSION = 'lab-1';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function safePath(value, field, allowRoot = false) {
  if (typeof value !== 'string' || value.length > 240 || !value || /[\\\x00-\x1f\x7f:*?"<>|]/.test(value)) throw new Error(`${field}: caminho relativo inválido.`);
  if (allowRoot && value === '.') return value;
  if (value.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`${field}: caminho relativo inválido.`);
  if (value.split('/').some((part) => /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error(`${field}: nome ambíguo/reservado no Windows.`);
  return value;
}

function command(value, field, fallback = '') {
  value ??= fallback;
  if (typeof value !== 'string' || value.length > 2000 || /[\x00-\x1f\x7f]/.test(value)) throw new Error(`${field}: comando inválido.`);
  return value.trim();
}

export function validateSpec(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error('build_spec deve ser um objeto JSON.');
  const allowed = new Set(['projectId', 'repository', 'sourceCommitSha', 'buildMode', 'rootDirectory', 'buildCommand', 'testCommand', 'startCommand', 'publishDirectory', 'dockerfilePath', 'internalPort', 'healthPath']);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error('build_spec contém campo não suportado pelo protótipo público.');
  if (!UUID.test(input.projectId)) throw new Error('projectId deve ser UUID.');
  if (typeof input.repository !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]+$/.test(input.repository) || input.repository.endsWith('/..') || input.repository.length > 150) throw new Error('repository inválido.');
  if (typeof input.sourceCommitSha !== 'string' || !/^[a-f0-9]{40}$/.test(input.sourceCommitSha)) throw new Error('sourceCommitSha deve ser SHA completo de 40 caracteres.');
  if (!['NODE_SERVICE', 'STATIC_SITE', 'DOCKERFILE'].includes(input.buildMode)) throw new Error('buildMode inválido.');
  const mode = input.buildMode;
  const buildCommand = command(input.buildCommand, 'buildCommand', mode === 'STATIC_SITE' ? 'npm run build' : '');
  const testCommand = command(input.testCommand, 'testCommand');
  const startCommand = command(input.startCommand, 'startCommand', mode === 'NODE_SERVICE' ? 'npm start' : '');
  if (mode === 'NODE_SERVICE' && !startCommand) throw new Error('Serviço Node exige startCommand.');
  if (mode === 'STATIC_SITE' && (!buildCommand || startCommand)) throw new Error('Site exige buildCommand e não aceita startCommand.');
  if (mode === 'DOCKERFILE' && (buildCommand || testCommand || startCommand)) throw new Error('Modo Dockerfile usa os comandos definidos pelo próprio arquivo.');
  if (mode !== 'STATIC_SITE' && input.publishDirectory != null) throw new Error('publishDirectory é exclusivo de site estático.');
  if (mode !== 'DOCKERFILE' && input.dockerfilePath != null) throw new Error('dockerfilePath exige modo Dockerfile.');
  const internalPort = input.internalPort ?? (mode === 'STATIC_SITE' ? 8080 : 3000);
  if (!Number.isInteger(internalPort) || internalPort < 1 || internalPort > 65535 || (mode === 'STATIC_SITE' && internalPort !== 8080)) throw new Error('internalPort inválida.');
  if (mode === 'DOCKERFILE' && input.internalPort == null) throw new Error('Modo Dockerfile exige internalPort explícita.');
  const healthPath = input.healthPath ?? (mode === 'STATIC_SITE' ? '/' : '/health');
  if (typeof healthPath !== 'string' || !/^\/(?!\/)[A-Za-z0-9/_.-]*$/.test(healthPath) || healthPath.includes('..') || healthPath.length > 240 || (mode === 'STATIC_SITE' && healthPath !== '/')) throw new Error('healthPath inválido.');
  return {
    projectId: input.projectId.toLowerCase(), repository: input.repository,
    sourceCommitSha: input.sourceCommitSha, buildMode: mode,
    rootDirectory: safePath(input.rootDirectory ?? '.', 'rootDirectory', true),
    buildCommand, testCommand, startCommand, internalPort, healthPath,
    ...(mode === 'STATIC_SITE' ? { publishDirectory: safePath(input.publishDirectory ?? 'dist', 'publishDirectory') } : {}),
    ...(mode === 'DOCKERFILE' ? { dockerfilePath: safePath(input.dockerfilePath ?? 'Dockerfile', 'dockerfilePath') } : {}),
  };
}

export function validateDeployId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('deploy_id deve ser UUID.');
  return value.toLowerCase();
}

export function imageReference(namespace, spec, deployId) {
  if (typeof namespace !== 'string' || !/^[a-z0-9][a-z0-9-]{0,38}$/.test(namespace)) throw new Error('Namespace GHCR inválido.');
  return `ghcr.io/${namespace}/app-${spec.projectId}:deploy-${validateDeployId(deployId)}`;
}
