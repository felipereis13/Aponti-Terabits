# Laboratório de deploy — etapa 02

Esta etapa entrega a VPS simulada, geradores de imagem, exemplos e workflow central manual. Não há login, GitHub App, worker nem endpoint de deploy. O laboratório aceita fontes públicas e controladas; não é uma hospedagem pública para executar código de terceiros sem confiança.

## Pré-requisitos

Node.js 24, Docker Desktop iniciado em modo Linux e clientes `ssh`, `sftp` e `ssh-keygen` disponíveis no PATH. No Windows, o Git for Windows fornece esses clientes. Usar PowerShell na raiz do projeto nos comandos abaixo. SSH usa 2222; as aplicações usam 4000–4020, somente em loopback do host.

O profile `lab` é opcional. O serviço `vps` usa Docker-in-Docker privilegiado e seu próprio volume `/var/lib/docker`; a API não recebe socket do Docker do host. O Engine interno atende somente no socket Unix, sem portas TCP 2375/2376. Aplicações publicadas não recebem modo privilegiado nem socket.

## Preparar e iniciar

```powershell
node infra/vps/setup.mjs
docker compose --profile lab up -d --build --wait vps
node infra/vps/trust-host.mjs
```

`setup.mjs` cria uma chave de cliente dedicada em `infra/vps/secrets/`, sem sobrescrever um par existente. A pasta é ignorada pelo Git e excluída do contexto de build da VPS. A chave pública é montada somente para leitura; a privada permanece no host. Sem a chave pública, o Compose recusa iniciar a VPS.

`trust-host.mjs` obtém a chave pública do servidor pelo canal administrativo Docker, grava `known_hosts` e imprime o fingerprint SHA256. Não aceita chave recebida pela rede como prova de identidade e não substitui confiança existente se a host key mudar. Confira também:

```powershell
docker compose --profile lab exec -T vps ssh-keygen -lf /etc/ssh/keys/ssh_host_ed25519_key.pub -E sha256
```

Se os fingerprints divergirem, investigar volumes/container antes de alterar a confiança manualmente. Não usar `StrictHostKeyChecking=no`.

## Conectar com SSH e SFTP

```powershell
ssh -p 2222 -i infra/vps/secrets/id_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=infra/vps/secrets/known_hosts deploy@127.0.0.1
```

O usuário `deploy` não pode autenticar por senha nem abrir túneis. Tem acesso ao Docker **interno da VPS**, equivalente a administração desse laboratório. Não reutilizar a chave fora desse ambiente.

Para preparar um diretório de exemplo, dentro da sessão SSH:

```sh
umask 077
mkdir -p /opt/terabits/apps/manual-demo
chmod 700 /opt/terabits/apps/manual-demo
exit
```

Crie um arquivo local `infra/vps/secrets/demo.env` usando editor de texto, com conteúdo não sensível como o modelo [demo.env.example](../infra/examples/demo.env.example). Não usar valores secretos em argumentos SSH ou comandos `docker run -e`.

Abra SFTP, a partir da raiz:

```powershell
sftp -P 2222 -i infra/vps/secrets/id_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=infra/vps/secrets/known_hosts deploy@127.0.0.1
```

No prompt SFTP:

```text
put infra/vps/secrets/demo.env /opt/terabits/apps/manual-demo/.env.tmp
chmod 600 /opt/terabits/apps/manual-demo/.env.tmp
rename /opt/terabits/apps/manual-demo/.env.tmp /opt/terabits/apps/manual-demo/.env
bye
```

O servidor aplica umask `0077`. Depois, confira por SSH:

```sh
stat -c %a /opt/terabits/apps/manual-demo/.env
```

O resultado deve ser `600`. Diretório restrito, arquivo temporário e rename evitam disponibilizar uma configuração parcial.

## Exemplos e geradores

| Exemplo | Configuração | Resultado |
|---|---|---|
| `infra/examples/node-service/` | `NODE_SERVICE`, teste `npm test`, início `npm start`, porta 3000 | Node sem root; `/health` mostra versão e `DEMO_MESSAGE` pública |
| `infra/examples/vite-site/` | `STATIC_SITE`, teste `npm test`, build `npm run build`, saída `dist` | React/Vite servido por Nginx sem root em 8080, com fallback SPA |

As pastas de origem contêm package.json, lockfile e fontes, sem Dockerfile nem workflow. Os arquivos `*.build.json` ficam fora dessas pastas e demonstram a configuração que futuramente virá da interface. `repository` e `sourceCommitSha` desses modelos são placeholders: substituir antes de executar o workflow real.

Para preparar um contexto local novo:

```powershell
node infra/scripts/prepare.mjs infra/examples/node-service infra/examples/node-service.build.json infra/.work/manual-node
```

Saída deve estar fora da origem e não pode existir previamente. O gerador não apaga diretórios existentes. O contexto separa `source/` de `trusted/`; comandos são serializados em JSON e executados somente no container. Gerador não modifica o repositório de origem.

Links simbólicos, arquivos especiais, nomes ambíguos no Windows e caminhos que escapam da raiz são recusados. `.env*`, chaves, `.npmrc`, `.netrc`, `.ssh`, `.git` e node_modules não entram no contexto. Regras básicas de glob e negação de `.dockerignore` são respeitadas; não usar esse mecanismo como substituto da exclusão obrigatória de credenciais. Dependências privadas e build secrets não fazem parte do protótipo.

Modo `DOCKERFILE` exige seleção explícita, caminho relativo e porta interna, e utiliza CMD/ENTRYPOINT do arquivo existente. Não aceita comandos de build/test/start no formulário. Ele não exige workflow na origem.

## Validar localmente

Testes de validação/arquivos, sem dependências adicionais:

```powershell
node --test infra/tests/*.test.mjs
```

Construção real dos três modos e cenários negativos, com Docker em execução:

```powershell
node infra/tests/build-smoke.mjs
```

O roteiro constrói serviço e site, confirma falhas de teste/build e valida Dockerfile opcional num diretório temporário. Usa namespace de imagem **local** `ghcr.io/terabits-lab/...`, sem login ou push. Artefatos/logs ficam em `infra/.work/` e são ignorados pelo Git. Os SHAs de placeholder dos testes locais não constituem rastreabilidade de uma execução remota.

Após preparar a VPS e registrar o fingerprint:

```powershell
node infra/tests/lab-smoke.mjs
```

Esse roteiro usa SSH/SFTP reais, recusa chave e host key incorretas, transfere `.env` com 600, importa as imagens locais e publica os exemplos **dentro da VPS**. Reinicia somente o serviço `vps` e verifica persistência da host key, imagens, containers e configuração. Também confirma que o Docker não abriu TCP.

Os exemplos ficam em [http://127.0.0.1:4000/health](http://127.0.0.1:4000/health) e [http://127.0.0.1:4001](http://127.0.0.1:4001). Containers `lab-stage-02-node` e `lab-stage-02-static` recebem label `io.terabits.lab=stage-02`. Ao repetir o roteiro, somente containers com esses nomes **e** label são substituídos; nomes pertencentes a outros recursos causam interrupção.

O transporte local de `image.tar` por SFTP permite validar Docker/SSH sem publicar nada no GitHub. Não comprova execução do workflow remoto ou push/pull do GHCR.

## Configurar e executar o workflow central no GitHub

Estes passos são manuais e pendentes até o responsável autorizar sua realização:

1. Criar dois repositórios públicos de teste e copiar somente o conteúdo de cada pasta de exemplo. Não copiar os geradores/workflows. Aprovar que essas fontes e suas imagens sejam públicas.
2. Registrar o SHA completo de um commit de cada origem (`git rev-parse HEAD` nesses repositórios). Não usar branch móvel como `sourceCommitSha`.
3. Publicar o código da Terabits e `.github/workflows/build-app.yml` no repositório central, com revisão/commit/push autorizados. O arquivo precisa estar na branch padrão para aparecer no disparo manual; selecionar a ref central que contenha os scripts correspondentes.
4. Habilitar GitHub Actions no repositório central. O token do job `publish` precisa de `packages: write`. Caso configure `GHCR_NAMESPACE` em Repository variables, usar namespace em que o token central tenha permissão de publicar; por padrão usa o proprietário do repositório em minúsculas.
5. Abrir Actions → Build application (public lab) → Run workflow. Fornecer um `deploy_id` UUID novo e o conteúdo do modelo build JSON com owner/repo e SHA reais. Cada projeto deve ter projectId UUID estável; cada publicação, deploymentId único.
6. Conferir os jobs `fetch`, `build` e `publish`. O primeiro só baixa fonte pública e gera contexto; o segundo constrói sem credenciais da origem/registry; somente o terceiro faz login/push. O resultado `result-<deploy_id>` contém digest e referência exata da imagem.
7. Em Packages, tornar pública a imagem de demonstração e conferir permissões do repositório central, quando exigido pelas políticas da conta/organização. Novos pacotes GHCR podem iniciar privados; o pull anônimo só funcionará após a configuração pública.

Formato de imagem: `ghcr.io/<namespace>/app-<projectId>:deploy-<deploymentId>`. O job recusa tag já existente e falha se não conseguir confirmar sua disponibilidade; não repita IDs para sobrescrever uma publicação. Alterações de políticas/permissões do registry devem ser resolvidas antes de repetir o fluxo com um ID novo. Não usar PAT ou GitHub App no protótipo público desta etapa.

Inputs não aceitam secrets. Não copiar token para build_spec, arquivos da origem, Dockerfile ou argumentos Docker. O publisher valida spec, identidade e labels antes do push. No Actions, a label `org.opencontainers.image.source` aponta ao repositório central, para vincular o pacote à Terabits; o SHA de revisão continua sendo o da aplicação selecionada. Download de fonte privada/autorização individual entra nas etapas 04/08.

## Publicar manualmente uma imagem pública do GHCR

Na sessão SSH, substituir `REFERENCIA_POR_DIGEST` pelo campo `reference` do result.json, sem credenciais na URL:

```sh
docker pull REFERENCIA_POR_DIGEST
docker run -d --name manual-demo-node --restart unless-stopped \
  --env-file /opt/terabits/apps/manual-demo/.env \
  -p 4002:3000 REFERENCIA_POR_DIGEST
```

Para o site, usar outra porta externa e porta interna 8080, sem `.env`:

```sh
docker pull REFERENCIA_DO_SITE_POR_DIGEST
docker run -d --name manual-demo-site --restart unless-stopped \
  -p 4003:8080 REFERENCIA_DO_SITE_POR_DIGEST
```

Validar `/health` do serviço e `/` do site pelo navegador no host. Dentro da VPS, o Docker publica em suas interfaces; o Compose restringe o acesso do host a `127.0.0.1`. Não vincular a porta interna a 127.0.0.1 na VPS, pois isso impediria o encaminhamento externo do Compose.

## Persistência e encerramento

Volumes nomeados: `vps_docker` (Engine/imagens/containers), `vps_apps` (arquivos de aplicações) e `vps_host_keys` (identidade SSH). O entrypoint encaminha sinais e encerra sshd/dockerd; o Compose concede 40 segundos. Reinício não deve trocar o fingerprint.

```powershell
docker compose --profile lab stop vps
```

Esse comando para somente o laboratório. Não executar prune global, `down -v`, apagar volumes nem remover dados de outros projetos. Preserve também a chave local de cliente e o known_hosts; recriar apenas um lado do vínculo de confiança exige revisão manual.

Referências: [Docker-in-Docker oficial](https://github.com/docker-library/docs/blob/master/docker/README.md), [Nginx sem root](https://github.com/nginx/docker-nginx-unprivileged), [uso seguro do Actions](https://docs.github.com/en/actions/reference/security/secure-use), [publicação de pacotes GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
