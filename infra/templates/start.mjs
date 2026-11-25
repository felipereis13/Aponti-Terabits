import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const spec = JSON.parse(readFileSync('/opt/terabits/spec.json', 'utf8'));
const child = spawn('/bin/sh', ['-c', spec.startCommand], {
  cwd: '/app', stdio: 'inherit', detached: true,
  env: { ...process.env, PORT: String(spec.internalPort) },
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  });
}
child.on('error', () => { console.error('Falha ao iniciar aplicação.'); process.exit(1); });
child.on('exit', (code, signal) => { process.exit(code ?? (signal === 'SIGTERM' ? 0 : 1)); });
