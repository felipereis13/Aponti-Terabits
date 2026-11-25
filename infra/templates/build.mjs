import { readFileSync, realpathSync, lstatSync, readdirSync, cpSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

// Este arquivo executa SOMENTE no container de build, nunca no host do runner.
const spec = JSON.parse(readFileSync('/opt/terabits/spec.json', 'utf8'));
function execute(command, args) {
  const result = spawnSync(command, args, { cwd: '/app', stdio: 'inherit', env: { PATH: process.env.PATH, HOME: '/home/node', CI: 'true' } });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
execute('npm', ['ci', '--no-audit', '--no-fund']);
if (spec.testCommand) execute('/bin/sh', ['-c', spec.testCommand]);
if (spec.buildCommand) execute('/bin/sh', ['-c', spec.buildCommand]);
if (spec.buildMode === 'NODE_SERVICE') {
  execute('npm', ['prune', '--omit=dev', '--no-audit', '--no-fund']);
} else {
  const output = realpathSync(resolve('/app', spec.publishDirectory));
  const inside = relative('/app', output);
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) throw new Error('publishDirectory fora da aplicação.');
  function check(directory) {
    for (const name of readdirSync(directory)) {
      const path = resolve(directory, name);
      const info = lstatSync(path);
      if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory())) throw new Error('Saída estática contém link ou arquivo especial.');
      if (info.isDirectory()) check(path);
    }
  }
  check(output);
  if (!lstatSync(resolve(output, 'index.html')).isFile()) throw new Error('Saída estática sem index.html.');
  cpSync(output, '/opt/terabits-output', { recursive: true });
}
