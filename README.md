# Terabits Deploy

Plataforma de deploy construída em etapas ao longo de cinco semanas. Stack: React, Vite, Tailwind e TypeScript no frontend; Node.js, Express, Prisma e PostgreSQL no backend; GitHub Actions, GHCR e SSH/SFTP para a publicação futura.

**Estado atual: etapa 01 — fundação.** A interface verifica a conexão com a API e o PostgreSQL. Login, integração GitHub e deploy ainda não estão implementados.

## Organização

```text
frontend/           Interface e chamadas HTTP
backend/            API, configuração, banco e testes
infra/              Laboratório VPS e templates das próximas etapas
docs/               Requisitos, arquitetura, contratos e prompts
.github/workflows/  Verificações automatizadas
AGENTS.md           Orientações para os agentes
docker-compose.yml  PostgreSQL de desenvolvimento e teste
```

Os projetos têm dependências e lockfiles separados. Execute os comandos npm dentro de `frontend/` ou `backend/`; não existe `package.json` na raiz.

## Pré-requisitos

- Node.js **24.x**, npm e Git.
- Docker Desktop iniciado, com Docker Engine em modo Linux (WSL2 no Windows).
- Portas locais livres: 5173 (web), 3001 (API), 15432 (banco) e 5433 (banco de teste). Dentro dos containers, o PostgreSQL usa 5432.
- Internet para instalar dependências e baixar a imagem PostgreSQL.

Os comandos abaixo usam PowerShell. `npm.cmd` evita o bloqueio de `npm.ps1` sem alterar a política de execução. Em Linux/macOS, use `npm` e substitua `Copy-Item` por `cp`.

## Iniciar a fundação

Na raiz:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
docker compose up -d --wait postgres
```

No primeiro terminal:

```powershell
cd backend
npm.cmd ci
npm.cmd run db:validate
npm.cmd run dev
```

No segundo terminal, a partir da raiz:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Abrir **http://127.0.0.1:5173**. A API atende em `http://127.0.0.1:3001/health` e `/ready`. O Vite encaminha `/api/*` para a API local; não é necessário abrir CORS.

O Prisma está configurado, mas não existem modelos de negócio nem migrations nesta etapa. A verificação de disponibilidade usa `pg` com `SELECT 1`. A geração do Prisma Client será necessária quando os primeiros modelos forem introduzidos na etapa 03.

## Verificar

Na raiz, iniciar o banco de teste:

```powershell
docker compose --profile test up -d --wait postgres-test
```

No backend:

```powershell
cd backend
npm.cmd run check
```

Esse comando executa lint, tipos, build e todos os testes da API. `npm.cmd test` roda somente os testes. O banco de teste usa usuário, nome e porta separados; os testes nunca reaproveitam `DATABASE_URL` do desenvolvimento. A suíte falha quando não consegue conectar ao PostgreSQL real.

No frontend:

```powershell
cd frontend
npm.cmd run check
```

Esse comando executa lint, tipos e build. Não há suíte de testes de UI nesta fundação. Os request specs do backend são a cobertura inicial. A CI executa os dois projetos e fornece PostgreSQL real para o backend.

O build do frontend exige um servidor com fallback para `index.html` e proxy `/api` em produção. `vite preview` serve para inspecionar o build; a configuração de proxy do desenvolvimento não constitui a hospedagem final. A containerização completa entra na etapa 15.

## Parar o ambiente

Encerre os terminais com `Ctrl+C` e, na raiz, execute:

```powershell
docker compose --profile test down
```

O banco de desenvolvimento permanece no volume. O banco de teste é temporário. Não use `down -v` sem querer apagar os dados locais.

## Desenvolver por etapas

1. Leia o [cronograma](docs/cronograma.md) e o [progresso real](docs/progresso.md).
2. Escolha somente o próximo arquivo no [índice de prompts](docs/prompts/README.md).
3. Copie o bloco do prompt para o agente; revise o plano e os comportamentos dos testes.
4. Revise migrations antes de sua aplicação. Valide a etapa antes de seguir.

A etapa 01 é a fundação desta entrega. O próximo prompt é **02 — Laboratório de deploy**. Não cole todos os prompts de uma vez.

## Documentação

- [Requisitos e limites do MVP](docs/requisitos.md)
- [Arquitetura e decisões](docs/arquitetura.md)
- [Fundamentos aplicados](docs/fundamentos.md)
- [Banco de dados planejado](docs/banco-de-dados.md)
- [API atual e contratos futuros](docs/api.md)
- [Cronograma](docs/cronograma.md)
- [Progresso e verificação](docs/progresso.md)

## Problemas comuns

- **Docker não conecta:** iniciar Docker Desktop e aguardar `docker info` funcionar em modo Linux.
- **Porta ocupada:** identificar o processo antes de mudar portas; atualizar Compose e `.env` juntos. No teste, usar `TEST_DATABASE_URL` para a nova porta local.
- **Frontend mostra indisponível:** conferir `/health`, `/ready`, o backend e `docker compose ps`.
- **Teste falha na conexão:** iniciar `postgres-test`; não substituir o banco real por mock.
- **npm aponta para registry privado indisponível:** verificar `npm.cmd config get registry`; usar o registry autorizado no ambiente sem versionar credenciais ou alterar configuração global sem necessidade.

As credenciais do Compose são exclusivas de desenvolvimento local. Não reutilizá-las em produção. Custos e cotas do GitHub dependem da conta; a demonstração não exige VPS em nuvem.
