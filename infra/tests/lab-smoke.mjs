import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('.');
const directory = resolve('infra/.work', `ssh-${Date.now()}`);
mkdirSync(directory, { recursive: true });
const secrets = resolve('infra/vps/secrets');
const privateKey = join(secrets, 'id_ed25519');
const knownHosts = join(secrets, 'known_hosts');
const forward = (path) => path.replaceAll('\\', '/');
const options = (key = privateKey, hosts = knownHosts) => [
  '-i', key, '-o', `UserKnownHostsFile="${forward(hosts)}"`,
  '-o', 'StrictHostKeyChecking=yes', '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
  '-o', 'ConnectTimeout=5', '-o', 'LogLevel=ERROR',
];
function run(command, args, input, timeout = 180000) {
  const result = spawnSync(command, args, { cwd: root, input, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  return result;
}
function ssh(command) {
  const result = run('ssh', [...options(), '-p', '2222', 'deploy@127.0.0.1', command]);
  if (result.status !== 0) throw new Error(`SSH falhou: ${result.stderr}`);
  return result.stdout.trim();
}
function sftp(batch) {
  const result = run('sftp', [...options(), '-P', '2222', '-b', '-', 'deploy@127.0.0.1'], batch);
  if (result.status !== 0) throw new Error(`SFTP falhou: ${result.stderr}`);
}

const badKey = join(directory, 'wrong-key');
const keyResult = run('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', badKey]);
assert.equal(keyResult.status, 0);
const denied = run('ssh', [...options(badKey), '-p', '2222', 'deploy@127.0.0.1', 'true']);
assert.notEqual(denied.status, 0);
assert.match(denied.stderr, /Permission denied/);
console.info('Chave de cliente incorreta: recusada.');

const badKnownHosts = join(directory, 'wrong-known-hosts');
writeFileSync(badKnownHosts, `[127.0.0.1]:2222 ${readFileSync(`${badKey}.pub`, 'utf8')}`);
const changed = run('ssh', [...options(privateKey, badKnownHosts), '-p', '2222', 'deploy@127.0.0.1', 'true']);
assert.notEqual(changed.status, 0);
assert.match(changed.stderr, /REMOTE HOST IDENTIFICATION HAS CHANGED|Host key verification failed/);
console.info('Host key divergente: recusada.');

assert.equal(ssh('id -un'), 'deploy');
ssh('docker info --format "{{.ServerVersion}}"');
ssh('umask 077; mkdir -p /opt/terabits/apps/lab-stage-02; chmod 700 /opt/terabits/apps/lab-stage-02');
const envFile = join(directory, 'demo.env');
writeFileSync(envFile, 'DEMO_MESSAGE=Transferida por SFTP\n', { mode: 0o600 });
sftp(`put "${forward(envFile)}" /opt/terabits/apps/lab-stage-02/.env.tmp\nchmod 600 /opt/terabits/apps/lab-stage-02/.env.tmp\nrename /opt/terabits/apps/lab-stage-02/.env.tmp /opt/terabits/apps/lab-stage-02/.env\n`);
assert.equal(ssh('stat -c %a /opt/terabits/apps/lab-stage-02/.env'), '600');
console.info('Arquivo .env transferido por SFTP com permissão 600.');

const builds = JSON.parse(readFileSync('infra/.work/build-results.json', 'utf8'));
for (const name of ['node', 'static']) {
  const imageDirectory = builds[name];
  if (!imageDirectory) throw new Error('Execute primeiro build-smoke.mjs.');
  const meta = JSON.parse(readFileSync(join(imageDirectory, 'operation.json'), 'utf8'));
  const remoteImage = `/opt/terabits/apps/lab-stage-02/${name}.tar`;
  sftp(`put "${forward(join(imageDirectory, 'image.tar'))}" ${remoteImage}\n`);
  ssh(`docker load --input ${remoteImage}`);
  const container = `lab-stage-02-${name}`;
  // Só substituir containers previamente identificados como deste roteiro.
  const existing = run('ssh', [...options(), '-p', '2222', 'deploy@127.0.0.1', `docker inspect --format '{{index .Config.Labels "io.terabits.lab"}}' ${container}`]);
  if (existing.status === 0) {
    if (existing.stdout.trim() !== 'stage-02') throw new Error('Container existente não pertence ao roteiro; não será removido.');
    ssh(`docker rm -f ${container}`);
  } else if (!/No such (object|container)/i.test(existing.stderr)) throw new Error('Falha ao verificar container existente.');
  const port = name === 'node' ? '4000:3000' : '4001:8080';
  const environment = name === 'node' ? '--env-file /opt/terabits/apps/lab-stage-02/.env' : '';
  ssh(`docker run -d --name ${container} --label io.terabits.lab=stage-02 --restart unless-stopped ${environment} -p ${port} ${meta.image}`);
}

async function verifyHttp() {
  const deadline = Date.now() + 60000;
  while (true) {
    try {
      const node = await fetch('http://127.0.0.1:4000/health', { signal: AbortSignal.timeout(3000) });
      const body = await node.json();
      assert.equal(node.status, 200);
      assert.equal(body.message, 'Transferida por SFTP');
      const site = await fetch('http://127.0.0.1:4001/example/spa-route', { signal: AbortSignal.timeout(3000) });
      assert.equal(site.status, 200);
      assert.match(await site.text(), /Terabits/);
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
await verifyHttp();
console.info('Node HTTP/variável e site Vite/fallback SPA: passaram.');
const fingerprintBefore = ssh('cat /etc/ssh/keys/ssh_host_ed25519_key.pub');
const restart = run('docker', ['compose', '--profile', 'lab', 'restart', 'vps']);
assert.equal(restart.status, 0, restart.stderr);
const ready = run('docker', ['compose', '--profile', 'lab', 'up', '-d', '--wait', 'vps']);
assert.equal(ready.status, 0, ready.stderr);
assert.equal(ssh('cat /etc/ssh/keys/ssh_host_ed25519_key.pub'), fingerprintBefore);
assert.equal(ssh('stat -c %a /opt/terabits/apps/lab-stage-02/.env'), '600');
await verifyHttp();
console.info('Reinício preservou host key, .env, imagens e containers.');
const listeners = ssh('netstat -lnt');
assert.doesNotMatch(listeners, /:(2375|2376)\s/);
writeFileSync(resolve('infra/.work/lab-results.json'), JSON.stringify({ ssh: true, wrongKeyRejected: true, wrongHostRejected: true, sftpMode: '600', nodeHttp: true, staticHttp: true, restartPersistence: true, dockerTcpDisabled: true }, null, 2));
console.info('Docker TCP desabilitado. Laboratório validado; containers de demonstração preservados.');
