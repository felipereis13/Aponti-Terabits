# Build e publicação centralizados

## Contrato do produto

O usuário conectará o GitHub, selecionará repositório/branch e informará como construir e iniciar a aplicação. A Terabits prepara a imagem e publica sem adicionar arquivos, commits ou workflows ao repositório selecionado. A etapa 02 entrega geradores e protótipo central manual para fontes públicas; conexão de contas e motor da API ainda não estão implementados. Validação local e execução remota pendente estão descritas em [Laboratório de deploy](laboratorio.md) e [Progresso](progresso.md).

Para caber nas cinco semanas, o suporte automático inicial será Node.js/npm e sites estáticos React/Vite/npm. Dockerfile existente é uma opção avançada explícita, não um pré-requisito nem uma detecção obrigatória. Outros ecossistemas, gerenciadores de pacotes e detecção automática ampla ficam para depois.

## Campos e padrões

| Campo | Regra |
|---|---|
| `buildMode` | `NODE_SERVICE`, `STATIC_SITE` ou `DOCKERFILE` |
| `rootDirectory` | Padrão `.`, caminho relativo dentro do repositório, sem escape por `..`, caminho absoluto ou symlink externo |
| `buildCommand` | Modo Node: opcional, sugestão `npm run build`; estático: obrigatório, padrão `npm run build` |
| `startCommand` | Serviço Node: obrigatório, padrão `npm start`; não usado no modo estático ou Dockerfile |
| `testCommand` | Opcional para Node/estático; quando preenchido, falha interrompe o build |
| `publishDirectory` | Estático: obrigatório, padrão `dist`, restrito ao diretório do app; não usado nos outros modos |
| `dockerfilePath` | Somente modo Dockerfile, padrão `Dockerfile` relativo à raiz selecionada |
| `internalPort` | Node: padrão 3000, configurável; estático: 8080 fixo; Dockerfile: informado pelo usuário |
| `healthPath` | Node/Dockerfile: padrão `/health`; estático: `/`; caminho HTTP relativo, não URL externa |

Instalação automática com Node.js 24 e `npm ci`; requer `package.json` e `package-lock.json` na raiz selecionada. Não executar `npm install` silenciosamente para contornar lockfile ausente. Serviço precisa escutar em `0.0.0.0` e respeitar a porta configurada; informar isso na UI. Start roda com `PORT` igual à internalPort; impedir variável `PORT` conflitante.

Site estático gera assets e os serve por Nginx sem root na porta 8080, com fallback SPA e healthPath `/`. Variáveis runtime não alteram assets compilados: desabilitar cadastro de variáveis nesse modo e explicar na tela. Não enviar segredos de usuário como argumentos Docker, variáveis do runner ou conteúdo de frontend; builds com variáveis/secrets ficam fora deste MVP.

Modo Dockerfile usa contexto da raiz selecionada e arquivo informado; startup é definido por CMD/ENTRYPOINT do próprio Dockerfile. Comandos de build/start do formulário não se aplicam. Nenhum modo exige workflow no código-fonte.

## Localização e configurações administrativas

- `.github/workflows/build-app.yml`: workflow de apps, mantido na Terabits e separado de `ci.yml`, que verifica a plataforma.
- `infra/templates/`: templates e scripts confiáveis dos geradores Node/estático; não copiar para repositórios de usuários.
- `infra/examples/`: fontes de demonstração sem Dockerfile/workflow, para copiar a repositórios de teste autorizados.
- Configuração de servidor: `BUILD_REPO_OWNER`, `BUILD_REPO_NAME`, `BUILD_WORKFLOW_FILE` (padrão `build-app.yml`), `BUILD_WORKFLOW_REF` (padrão `main`), `BUILD_INSTALLATION_ID` e `GHCR_NAMESPACE`.
- GitHub App instalada no repositório central e nos repositórios selecionados; IDs das instalações podem ser diferentes. Credenciais centrais são configuradas pelo administrador, nunca pelo formulário de projeto.

A configuração externa é manual e exige autorização do responsável: publicar workflow no repositório Terabits, configurar credenciais da App e tornar públicas as imagens de demonstração. Não publicar código de clientes privados sem autorização: mesmo imagem pública pode conter o código compilado. A demonstração usa apenas fontes aprovadas para exposição pública.

## Fluxo

1. API revalida acesso ao repositório e resolve branch para `sourceCommitSha` exato. Não confundir SHA do app com SHA do workflow central.
2. Operação persiste snapshot imutável da configuração e origem. Retry/idempotência recupera a operação original e seu SHA; não avança para o novo head da branch.
3. Worker dispara workflow central com `deploy_id` e `build_spec` JSON, sem tokens/segredos nesses inputs. O spec contém projeto, repositório, instalação de origem, SHA e configuração de build validada.
4. Etapa confiável obtém fonte com token temporário da App limitado a Contents read no repositório de origem. Não executar scripts do app durante download. Remover `.git`, credenciais e arquivos temporários de autenticação antes de disponibilizar o contexto.
5. Job de build separado recebe apenas fonte e configuração. Gera Dockerfile em área controlada ou usa arquivo opcional indicado; instala, testa e constrói dentro de Docker/BuildKit em runner hospedado efêmero. Não executar scripts do app no host do runner. Nenhuma chave da App, token de origem, chave SSH, segredo runtime ou token de escrita de pacotes chega ao container/contexto de build.
6. Job de publicação separado usa `GITHUB_TOKEN` do repositório central com Packages write, publica a imagem sob namespace da Terabits e fornece resultado correlacionado ao deploy/SHA e digest. Projeto não escolhe namespace nem imagem arbitrária. Validar metadados de artefatos antes de consumi-los; não executar código contido neles no job privilegiado.
7. Worker acompanha o run no repositório central, valida resultado e executa a publicação SSH/SFTP já planejada.

Não usar token de instalação de origem para disparar workflow no repo do usuário. `GITHUB_TOKEN` do workflow central não concede automaticamente leitura de outros repositórios privados; a fonte usa sua própria autorização de App.

## Validação e isolamento

Comandos de build/test/start são configuração intencional do usuário e só executam dentro do container apropriado. Validar tipo, tamanho e ausência de CR/LF/NUL; serializar configuração como JSON e usar scripts fixos. Não interpolar comandos, branch ou caminhos diretamente em YAML, shell do runner, instruções Dockerfile ou SSH. Conteúdo do projeto não pode sobrescrever scripts/templates confiáveis.

Validar rootDirectory, publishDirectory e dockerfilePath inclusive após extração; impedir path traversal e symlinks para fora da raiz. No modo automático respeitar exclusões de contexto, garantindo que credenciais e `.env` nunca sejam incluídos. Dockerfile arbitrário e dependências ainda representam execução de código: laboratório restrito a projetos controlados, sem promessa de isolamento de hospedagem pública multiusuário.

## Testes e aceitação

- Serviço Node e site Vite sem Dockerfile/workflow são aceitos, construídos e servidos por HTTP.
- Modo Dockerfile é explícito e não exige Actions na origem.
- Falha de testes/build impede push/publicação; lockfile ausente e modo incompatível têm erro claro.
- Fonte privada usa token de leitura restrito, sem token do usuário/privado no contexto ou artefato.
- Dispatch/polling ocorre no repo central; origem e workflow têm refs e instalações distintas.
- Comandos com aspas/metacaracteres permanecem dados no host; path traversal, symlink externo e metadados de imagem inesperados são rejeitados.
- Alterar head da branch durante retry não altera SHA/configuração da operação original.
- Site estático não aceita segredos runtime e suporta atualização/rollback da imagem.

Rollback usa modo/porta interna/healthPath do snapshot da imagem restaurada, mantendo a porta externa do projeto. Variáveis atuais só entram se essa imagem for de serviço. Bloquear mudança de projeto para modo estático enquanto houver variáveis cadastradas, solicitando remoção explícita antes; não apagar segredos silenciosamente.

Referências: [escopo de credenciais no checkout](https://github.com/actions/checkout), [workflow dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event) e [uso seguro do Actions](https://docs.github.com/en/actions/reference/security/secure-use).
