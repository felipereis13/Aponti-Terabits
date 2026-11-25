import { readFileSync, writeFileSync, mkdirSync, cpSync, lstatSync, readdirSync, realpathSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, join, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpec, GENERATOR_VERSION } from './spec.mjs';

const templates = fileURLToPath(new URL('../templates/', import.meta.url));
export function checkedPath(root, path) {
  let current = root;
  for (const part of path === '.' ? [] : path.split('/')) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error('Links simbólicos não são suportados no contexto.');
  }
  const actual = realpathSync(current);
  const difference = relative(root, actual);
  if (difference.startsWith('..') || isAbsolute(difference)) throw new Error('Caminho fora do repositório.');
  return actual;
}

function excludedName(name) {
  return ['.git', '.hg', '.svn', 'node_modules', '.npmrc', '.yarnrc', '.netrc', '.ssh', 'id_ed25519', 'id_rsa', '.env'].includes(name) || name.startsWith('.env.') || /\.(pem|key|p12|pfx)$/i.test(name);
}

function ignoreRules(root) {
  const file = join(root, '.dockerignore');
  if (!existsSync(file)) return [];
  if (lstatSync(file).isSymbolicLink()) throw new Error('.dockerignore não pode ser link.');
  return readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => ({
    include: line.startsWith('!'), pattern: line.replace(/^!/, '').replace(/^\/+|\/+$/g, ''),
  }));
}

function ignored(path, rules) {
  const components = path.split('/');
  const ancestors = components.map((_, index) => components.slice(0, index + 1).join('/'));
  let skip = false;
  for (const rule of rules) {
    if (ancestors.some((entry) => matchesGlob(entry, rule.pattern) || (!rule.pattern.includes('/') && entry.split('/').some((part) => matchesGlob(part, rule.pattern))))) skip = !rule.include;
  }
  return skip;
}

export function prepareContext(source, output, rawSpec) {
  const spec = validateSpec(rawSpec);
  const repository = realpathSync(resolve(source));
  const root = checkedPath(repository, spec.rootDirectory);
  if (!lstatSync(root).isDirectory()) throw new Error('rootDirectory deve ser diretório.');
  const destination = resolve(output);
  const nested = relative(repository, destination);
  if (!nested.startsWith('..') && !isAbsolute(nested)) throw new Error('Saída deve ficar fora do repositório de origem.');
  if (existsSync(destination)) throw new Error('Saída já existe; use um diretório novo, sem apagar arquivos automaticamente.');
  if (spec.buildMode !== 'DOCKERFILE') {
    for (const file of ['package.json', 'package-lock.json']) {
      if (!existsSync(join(root, file))) throw new Error(`Arquivo obrigatório ausente: ${file}.`);
      if (!lstatSync(checkedPath(root, file)).isFile()) throw new Error('Manifesto deve ser arquivo regular.');
      JSON.parse(readFileSync(join(root, file), 'utf8'));
    }
  } else if (!lstatSync(checkedPath(root, spec.dockerfilePath)).isFile()) throw new Error('Dockerfile deve ser arquivo regular.');

  const rules = ignoreRules(root);
  mkdirSync(join(destination, 'source'), { recursive: true });
  let count = 0;
  function copy(directory, subpath = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (excludedName(entry.name)) continue;
      const path = subpath ? `${subpath}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) throw new Error('Contexto contém link ou arquivo especial.');
      if (++count > 20000) throw new Error('Contexto excede limite de arquivos.');
      const target = join(destination, 'source', path);
      if (entry.isDirectory()) copy(join(directory, entry.name), path);
      else if (!ignored(path, rules)) {
        mkdirSync(resolve(target, '..'), { recursive: true });
        copyFileSync(join(directory, entry.name), target);
      }
    }
  }
  copy(root);
  const required = spec.buildMode === 'DOCKERFILE' ? [spec.dockerfilePath] : ['package.json', 'package-lock.json'];
  if (required.some((file) => !existsSync(join(destination, 'source', file)))) throw new Error('.dockerignore exclui arquivo obrigatório.');
  mkdirSync(join(destination, 'trusted'));
  writeFileSync(join(destination, 'trusted/spec.json'), JSON.stringify(spec, null, 2));
  for (const file of ['build.mjs', 'start.mjs', 'nginx.conf']) cpSync(join(templates, file), join(destination, 'trusted', file));
  if (spec.buildMode !== 'DOCKERFILE') cpSync(join(templates, spec.buildMode === 'STATIC_SITE' ? 'static.Dockerfile' : 'node.Dockerfile'), join(destination, 'Dockerfile'));
  writeFileSync(join(destination, 'metadata.json'), JSON.stringify({ generatorVersion: GENERATOR_VERSION, spec }, null, 2));
  return { spec, directory: destination };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , source, specFile, output] = process.argv;
  if (!source || !specFile || !output) throw new Error('Uso: node infra/scripts/prepare.mjs <origem> <spec.json> <saída-nova>');
  prepareContext(source, output, JSON.parse(readFileSync(specFile, 'utf8')));
  console.info('Contexto preparado; comandos permanecem em JSON e não foram executados no host.');
}
