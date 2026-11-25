import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('./secrets/', import.meta.url));
mkdirSync(directory, { recursive: true, mode: 0o700 });
const privateKey = `${directory}id_ed25519`;
if (existsSync(privateKey) !== existsSync(`${privateKey}.pub`)) {
  throw new Error('Par de chaves incompleto. Revise os arquivos existentes; nenhuma chave será sobrescrita.');
}
if (!existsSync(privateKey)) {
  const result = spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'terabits-local-lab', '-f', privateKey], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Falha ao gerar chave SSH dedicada.');
  chmodSync(privateKey, 0o600);
}
console.info('Chave dedicada preparada em infra/vps/secrets/ (ignorada pelo Git).');
console.info('Execute docker compose --profile lab up -d --build --wait vps.');
