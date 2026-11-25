# Progresso

Este arquivo distingue implementação, planejamento e verificação. Etapas 02–15 estão planejadas e não foram iniciadas.

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

## Próximo passo

Executar [02 — Laboratório de deploy](prompts/02-laboratorio.md), depois de validar a fundação. Não iniciar automaticamente.

| Etapa | Status |
|---|---|
| 01 Fundação | Implementada e validada localmente |
| 02 Laboratório | Planejada |
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
