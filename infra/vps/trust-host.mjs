import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Obter a chave pelo canal administrativo Docker, nunca confiar em ssh-keyscan sozinho.
const root = fileURLToPath(new URL('../../', import.meta.url));
const result = spawnSync('docker', ['compose', '--profile', 'lab', 'exec', '-T', 'vps', 'cat', '/etc/ssh/keys/ssh_host_ed25519_key.pub'], { cwd: root, encoding: 'utf8' });
if (result.error || result.status !== 0) throw new Error('Não foi possível obter a chave pública do servidor pelo Docker.');
const key = result.stdout.trim().split(/\s+/).slice(0, 2).join(' ');
if (!/^ssh-ed25519 [A-Za-z0-9+/=]+$/.test(key)) throw new Error('Chave pública do servidor inválida.');
const line = `[127.0.0.1]:2222 ${key}\n`;
const directory = fileURLToPath(new URL('./secrets/', import.meta.url));
mkdirSync(directory, { recursive: true, mode: 0o700 });
const target = `${directory}known_hosts`;
if (existsSync(target) && readFileSync(target, 'utf8') !== line) {
  throw new Error('Host key mudou. Revise a causa e o arquivo known_hosts manualmente; confiança não foi substituída.');
}
writeFileSync(target, line, { mode: 0o600 });
const fingerprint = spawnSync('ssh-keygen', ['-lf', target, '-E', 'sha256'], { encoding: 'utf8' });
if (fingerprint.status !== 0) throw new Error('Não foi possível calcular o fingerprint.');
console.info(fingerprint.stdout.trim());
