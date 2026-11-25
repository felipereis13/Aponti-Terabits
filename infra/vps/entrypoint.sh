#!/bin/sh
set -eu
umask 077

test -s /run/terabits/authorized_keys || { echo 'Execute primeiro node infra/vps/setup.mjs.' >&2; exit 1; }
mkdir -p /run/sshd /home/deploy/.ssh /etc/ssh/keys /opt/terabits/apps
cp /run/terabits/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:docker /home/deploy/.ssh /opt/terabits/apps
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
if [ ! -s /etc/ssh/keys/ssh_host_ed25519_key ]; then
  ssh-keygen -q -t ed25519 -N '' -f /etc/ssh/keys/ssh_host_ed25519_key
fi
chmod 600 /etc/ssh/keys/ssh_host_ed25519_key
chmod 644 /etc/ssh/keys/ssh_host_ed25519_key.pub
/usr/sbin/sshd -t

# Explicitamente apenas Unix socket: não usar o entrypoint DinD que habilita TCP.
dockerd --host=unix:///var/run/docker.sock --group=docker &
docker_pid=$!
ssh_pid=''
shutdown() {
  trap '' TERM INT
  if [ -n "$ssh_pid" ]; then kill -TERM "$ssh_pid" 2>/dev/null || true; fi
  kill -TERM "$docker_pid" 2>/dev/null || true
  if [ -n "$ssh_pid" ]; then wait "$ssh_pid" 2>/dev/null || true; fi
  wait "$docker_pid" 2>/dev/null || true
}
trap 'shutdown; exit 0' TERM INT

attempt=0
until docker info >/dev/null 2>&1; do
  kill -0 "$docker_pid" 2>/dev/null || { wait "$docker_pid"; exit 1; }
  attempt=$((attempt + 1))
  [ "$attempt" -lt 60 ] || { shutdown; exit 1; }
  sleep 1
done
/usr/sbin/sshd -D -e &
ssh_pid=$!
while kill -0 "$docker_pid" 2>/dev/null && kill -0 "$ssh_pid" 2>/dev/null; do sleep 1; done
shutdown
exit 1
