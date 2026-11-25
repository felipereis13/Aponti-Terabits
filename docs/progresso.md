# Progresso

Este arquivo distingue implementação, planejamento e verificação. Etapa 02 implementada e validada localmente, com aceite remoto GitHub/GHCR pendente. Etapas 03–15 estão planejadas e não foram iniciadas.

## Etapa 01 — fundação

Implementado: frontend React/Vite/Tailwind com conexão real à API, backend Express com `/health` e `/ready`, PostgreSQL local/teste no Compose, configuração Prisma sem modelos, suíte request spec, CI, documentação e prompts.

Verificação concluída em 25/11/2026:

- Frontend: `npm.cmd run check` passou (lint, TypeScript e build Vite).
- Backend: `npm.cmd run check` passou (lint, TypeScript da aplicação/testes, build e **5 testes de integração**, 1 arquivo).
- PostgreSQL real no Docker: serviços de desenvolvimento e teste saudáveis. Nenhum mock de banco.
- `npm.cmd run db:validate`: schema Prisma válido, sem modelos nem migrations.
- `docker compose --profile test config --quiet`: configuração válida.
- Verificação HTTP: frontend 200, API `/health` 200, `/ready` 200 e proxy Vite `/api/ready` 200.
- Links locais da documentação válidos e 15 prompts de etapa presentes.
- `.env`, dependências e builds confirmados como ignorados pelo Git. Branch: `chore/fundacao`; sem commit ou publicação externa.

Adaptação de ambiente: o Windows recusou o bind da porta 5432; o banco de desenvolvimento usa **15432** no host. PostgreSQL continua em 5432 dentro do container. Banco de teste usa 5433 no host. Lockfiles usam URLs públicas do npm para não depender do registry local da máquina.

A CI foi configurada, mas não foi executada no GitHub nesta entrega. Não houve inspeção visual em navegador automatizado; frontend, comunicação HTTP/proxy e build foram verificados localmente.

Ajuste posterior: classe Tailwind `bg-white/[0.025]` normalizada para `bg-white/2.5`, removendo a sugestão do editor sem alterar a opacidade. Lint, tipos e build do frontend passaram novamente.

Nenhuma migration, conta, integração externa ou aplicação publicada foi criada nesta etapa.

## Atualizações de documentação — 25/11/2026

README reorganizado como apresentação geral, tecnologias, pré-requisitos, execução e encerramento do ambiente. Procedimentos de desenvolvimento, testes, build e diagnóstico centralizados em `docs/desenvolvimento.md`; índice criado em `docs/README.md`. Planejamento e histórico continuam em seus documentos próprios. `AGENTS.md` atualizado para manter essa organização nas próximas alterações. Alteração somente documental, validada por conferência dos links locais e dos comandos frente aos scripts existentes.

## Revisão do build — 25/11/2026

Revisão de produto — 25/11/2026: o usuário confirmou build/publicação centralizados na Terabits. Projetos selecionados não precisam conter Dockerfile nem workflow; configuração vem da interface, com geração para Node/npm e React/Vite estático e modo Dockerfile opcional. Atualizados requisitos, arquitetura, contratos/modelo planejados, cronograma, infraestrutura e prompts afetados; detalhes em [Build e publicação](build-publicacao.md). Esta revisão altera apenas o planejamento/documentação; não implementa motor, integração GitHub, migrations nem workflows de publicação. A CI existente da fundação permanece distinta do workflow central futuro.

Verificação desta revisão: links locais válidos e `git diff --check` sem erros de whitespace. Testes da aplicação não foram repetidos porque não houve alteração de código executável. A regra existente `prompts/` do `.gitignore` foi preservada: os prompts revisados em `docs/prompts/` permanecem disponíveis localmente, mas não são versionados pelo Git.

## Etapa 02 — laboratório de deploy — 25/11/2026

Implementado na branch `feature/deploy-lab`, preservando as alterações documentais anteriores sem commit:

- Profile `lab` com VPS DinD/OpenSSH, usuário `deploy`, volumes independentes de Docker/apps/host keys, inicialização/encerramento e healthcheck. Portas 2222 e 4000–4020 apenas no loopback do host; Engine interno somente por Unix socket.
- Setup idempotente de chave SSH dedicada e registro de fingerprint via canal administrativo Docker, recusando substituição silenciosa. Chaves locais/artefatos ignorados pelo Git; `.dockerignore` da VPS exclui chaves do contexto.
- Exemplos Node e React/Vite com package.json/lockfile, sem Dockerfile/workflow na origem. Geradores de NODE_SERVICE/STATIC_SITE e opção DOCKERFILE explícita, com configuração em JSON e scripts separados do código-fonte.
- Preparação de contexto e extrator tar restrito, exclusão de credenciais e validação de caminhos/links. Scripts de build/publicação sem executar comandos do app no host.
- `.github/workflows/build-app.yml` manual, com fonte pública por SHA fixo, jobs separados para download/build/push, namespace central e resultado por digest. CI ampliada para testar os geradores.
- Guia [Laboratório de deploy](laboratorio.md), incluindo SSH/SFTP, `.env` 600, pull por digest, configuração manual do GitHub/GHCR e limites do protótipo.

### Evidências locais

| Verificação | Resultado |
|---|---|
| `node --test infra/tests/*.test.mjs` | 13 testes passaram, sem skips; comandos com aspas, manifesto ausente, traversal/links/nomes Windows, archives inválidos e metadados de outra operação cobertos |
| `node infra/tests/build-smoke.mjs` | Serviço Node e site Vite construídos; falhas de teste e build recusadas |
| `node infra/tests/build-smoke.mjs --only-custom` | Dockerfile opcional construído, sem adicioná-lo aos exemplos |
| `node infra/tests/lab-smoke.mjs` | SSH/SFTP reais; chave errada e host key divergente recusadas; `.env` 600; variável no app; HTTP Node e SPA; reinício com persistência; Docker sem TCP |
| Actionlint 1.7.12 em `build-app.yml` e `ci.yml` | Passou |
| Compose com profiles `lab` e `test` | Configuração válida; PostgreSQL, PostgreSQL de teste e VPS saudáveis |
| `npm.cmd run check` em frontend | Lint, tipos e build passaram |
| `npm.cmd run check` em backend | Lint, tipos, build e 5 testes PostgreSQL reais passaram |
| `npm.cmd run db:validate` em backend | Schema válido; nenhuma migration criada ou aplicada |

Serviço de demonstração em `http://127.0.0.1:4000/health`; site em `http://127.0.0.1:4001`. Containers identificados por label foram preservados após o teste. Artefatos e relatórios de execução ficam em `infra/.work/`, fora do Git. Nenhum segredo real foi usado no exemplo.

### Aceite externo pendente

Não houve commit, push, publicação de repositórios, execução no GitHub Actions ou push/pull real de imagem no GHCR. Ainda é necessário, com autorização, publicar fontes de exemplo aprovadas e workflow central, configurar permissões dos pacotes/imagens públicas e executar os dois fluxos remotos por SHA. As imagens locais foram transferidas por SFTP para validar o destino; isso não substitui o aceite remoto. Autenticação de usuários, App privada, worker e motor de deploy não foram iniciados.

## Próximo passo

Concluir o aceite externo da etapa 02 quando autorizado, conforme o guia do laboratório. A etapa 03 (contas e sessões) requer nova solicitação; não iniciar automaticamente.

| Etapa | Status |
|---|---|
| 01 Fundação | Implementada e validada localmente |
| 02 Laboratório | Implementada/validada localmente; aceite remoto pendente |
| 03 Contas | Planejada |
| 04 GitHub | Planejada |
| 05 Projetos | Planejada |
| 06 Variáveis | Planejada |
| 07 Operações | Planejada |
| 08 Actions/GHCR | Planejada |
| 09 Publicação | Planejada |
| 10 Histórico/rollback | Planejada |
| 11 Logs/exclusão | Planejada |
| 12 Recuperação | Planejada |
| 13 Validação | Planejada |
| 14 Auditoria/UX | Planejada |
| 15 Entrega | Planejada |
