# API HTTP

## Convenções

API responde JSON. Em desenvolvimento: API direta em `http://127.0.0.1:3001`; navegador usa `/api` através do Vite. O proxy remove esse prefixo. APIs abaixo são os caminhos no Express, sem `/api`.

Erros de negócio usarão `{ "error": { "code": "CODIGO", "message": "Mensagem segura" } }`. Não incluir stack, tokens ou credenciais. Respostas não expõem entidades Prisma diretamente. Falta de autenticação: 401; recurso inexistente ou de outro usuário: 404; conflito de operação: 409; entrada inválida: 400; falha de integração: 502/503 conforme disponibilidade.

## Disponível agora

| Método | Caminho | Resposta |
|---|---|---|
| GET | `/health` | 200 `{ "status": "ok" }`, sem consultar banco |
| GET | `/ready` | 200 `{ "status": "ready", "database": "available" }` após SELECT 1 |
| GET | `/ready` | 503 `{ "status": "not_ready", "database": "unavailable" }` se banco falhar |

Prontidão tem `Cache-Control: no-store` e timeout de conexão/consulta de 2 segundos cada. Rota inexistente retorna 404 NOT_FOUND. Headers de segurança via Helmet. Nenhuma rota funcional abaixo foi implementada na fundação.

## Contratos planejados

| Etapa | Rotas | Comportamento |
|---|---|---|
| 03 | POST `/auth/register`, `/auth/login`, `/auth/logout`; GET `/auth/me`, `/auth/csrf` | Cadastro/login emitem sessão por cookie; CSRF em mutações; logout invalida sessão |
| 04 | GET `/github/connect`, `/github/callback`, `/github/setup`, `/github/installations`, `/github/repositories`, `/github/repositories/:id/branches`; DELETE `/github/connection` | OAuth e instalação verificados no servidor; repositórios paginados acessíveis à identidade conectada |
| 05 | GET/POST `/projects`; GET/PATCH `/projects/:id` | Propriedade e configuração validadas; porta externa só do servidor; listagem paginada com busca por nome |
| 06 | GET `/projects/:id/environment`; PUT/DELETE `/projects/:id/environment/:key` | GET somente chaves/metadados; PUT recebe novo valor, nunca revela o existente |
| 07–09 | POST `/projects/:id/deployments`; GET `/projects/:id/deployments/:deploymentId` | POST exige Idempotency-Key, responde 202 com ID/status; execução assíncrona |
| 10 | GET `/projects/:id/deployments`; POST `/projects/:id/rollbacks` | Histórico paginado e rollback com sourceDeploymentId, mesma proteção de idempotência |
| 11 | GET `/projects/:id/logs?lines=100`; DELETE `/projects/:id` | Logs limitados a 100/200/500 e erro amigável se sem container; exclusão com limpeza remota antes de liberar porta |

Cadastro de projeto recebe nome, repositoryId, installationId de origem, branch, buildMode, rootDirectory e configuração de build/test/start, publishDirectory ou dockerfilePath conforme o modo, internalPort e healthPath. Padrões e aplicabilidade estão em [Build e publicação](build-publicacao.md). Não existe workflowFile por projeto: workflow/ref/instalação central/namespace GHCR vêm do servidor. API verifica autorização, branch e arquivos necessários ao modo (package.json/lockfile ou Dockerfile opcional), sem exigir workflow na origem. Comandos do usuário são permitidos exclusivamente nos containers de build/runtime, nunca em shell do servidor ou SSH. Não aceitar host SSH, imageRef, externalPort ou estado interno do cliente. Variáveis iniciais opcionais de serviços entram na etapa 06, em transação com o projeto; site estático rejeita variáveis runtime.

Idempotency-Key será UUID gerado uma vez pela UI por intenção de deploy/rollback, reutilizado em retry. Mesma chave/conteúdo: mesma operação/202; conteúdo diferente: 409 IDEMPOTENCY_CONFLICT. Outra operação ativa: 409 DEPLOYMENT_IN_PROGRESS. Autorização sempre vem antes de consultar/reutilizar chave. A primeira aceitação resolve SHA da branch e captura configuração de build; repetir a chave retorna esse snapshot sem resolver novo head. Histórico apresenta SHA da origem, modo e imagem/digest da operação.

Projeto apresentará separadamente tentativa mais recente e deploy ativo. Histórico terá tipo, autor, imagem, datas, status e indicação da versão ativa. Nunca usar status enviado pelo browser para avançar pipeline.

Os endpoints futuros devem ganhar schemas e testes nas respectivas etapas. Manter este documento sincronizado com a implementação real e registrar mudanças de contrato.
