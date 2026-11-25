# Guia de desenvolvimento

Para instalar e iniciar o projeto, seguir o [README principal](../README.md). Este guia reúne os procedimentos de desenvolvimento e diagnóstico.

## Ambiente e configuração

Usar Node.js 24.x. Frontend e backend têm projetos npm independentes; não existe `package.json` na raiz. Os exemplos de comandos usam PowerShell e `npm.cmd` para evitar o bloqueio de `npm.ps1`. Em Linux/macOS, usar `npm`.

| Configuração | Local | Uso |
|---|---|---|
| `DATABASE_URL` | `backend/.env` | PostgreSQL de desenvolvimento em `127.0.0.1:15432` |
| `TEST_DATABASE_URL` | Ambiente do processo de testes | PostgreSQL de testes em `127.0.0.1:5433` por padrão |
| `HOST` e `PORT` | `backend/.env` | Endereço HTTP da API, padrão `127.0.0.1:3001` |
| `API_PROXY_TARGET` | `frontend/.env` | Destino do proxy do Vite, padrão `http://127.0.0.1:3001` |

O runner de testes não carrega o `.env` de desenvolvimento: usa a URL padrão de teste ou `TEST_DATABASE_URL` fornecida ao processo. O exemplo dessa variável em `backend/.env.example` é uma referência; para alterar a porta de testes no PowerShell, definir `$env:TEST_DATABASE_URL` antes de executar a suíte.

Não versionar `.env` ou credenciais. As senhas fornecidas no Compose são somente para uso local. Dentro dos containers, o PostgreSQL atende em 5432; as portas 15432 e 5433 são os mapeamentos no host.

## Comandos

Executar dentro da pasta indicada:

| Pasta | Comando | Finalidade |
|---|---|---|
| `frontend/` | `npm.cmd run dev` | Iniciar Vite |
| `frontend/` | `npm.cmd run check` | Lint, tipos e build |
| `frontend/` | `npm.cmd run build` | Gerar arquivos em `dist/` |
| `frontend/` | `npm.cmd run preview` | Inspecionar o build localmente |
| `backend/` | `npm.cmd run dev` | Iniciar API com recarga |
| `backend/` | `npm.cmd run check` | Lint, tipos, build e testes |
| `backend/` | `npm.cmd test` | Executar todos os testes da API |
| `backend/` | `npm.cmd run test:watch` | Executar testes em modo contínuo |
| `backend/` | `npm.cmd run build` | Compilar API para `dist/` |
| `backend/` | `npm.cmd start` | Executar API já compilada |
| `backend/` | `npm.cmd run db:validate` | Validar schema Prisma com ambiente local configurado |

## Testes com PostgreSQL real

Na raiz, iniciar o serviço de teste:

```powershell
docker compose --profile test up -d --wait postgres-test
```

Em seguida:

```powershell
cd backend
npm.cmd run check
```

A suíte usa banco e usuário `terabits_test`, com armazenamento temporário e validação do destino. Não reaproveita `DATABASE_URL` do desenvolvimento e falha se o PostgreSQL de teste estiver indisponível. Não substituir esse banco por mock.

O frontend é verificado com `npm.cmd run check` dentro de `frontend/`. As verificações da CI estão em [ci.yml](../.github/workflows/ci.yml); o job do backend fornece PostgreSQL real. A cobertura e os resultados efetivamente obtidos ficam em [progresso](progresso.md).

## Prisma e migrations

O estado do schema e dos modelos está descrito em [banco de dados](banco-de-dados.md). Atualmente, a prontidão usa `pg` com `SELECT 1`, e o schema Prisma ainda não tem modelos de negócio. A geração do Prisma Client será necessária ao introduzir os primeiros modelos.

Preparar migrations para revisão antes de aplicar, inclusive localmente. Não usar `db push`, reset ou banco de produção para contornar esse processo. Instalação e startup não devem aplicar migrations automaticamente.

## Build e hospedagem

O build do frontend precisa de servidor com fallback para `index.html` e proxy `/api` na mesma origem. A configuração de proxy do Vite atende ao desenvolvimento; `vite preview` permite inspecionar o build, mas não representa a hospedagem final.

O backend precisa ser compilado antes de `npm.cmd start` e receber suas variáveis de ambiente. A containerização completa é uma entrega planejada no [cronograma](cronograma.md).

## Diagnóstico

| Sintoma | Verificação |
|---|---|
| Docker não conecta | Iniciar Docker Desktop, aguardar `docker info` responder e confirmar modo Linux |
| Porta indisponível | Identificar o conflito antes de mudar a porta; manter Compose e configuração local consistentes |
| Interface mostra conexão indisponível | Conferir API em `/health` e `/ready`, terminal do backend e `docker compose ps` |
| Testes falham na conexão | Iniciar `postgres-test`; conferir a porta e a variável de teste do processo |
| `npm.ps1` bloqueado | Usar `npm.cmd`, sem alterar a política de execução do sistema |
| npm usa registry privado indisponível | Conferir `npm.cmd config get registry`; usar o registry autorizado sem versionar credenciais |

`/health` verifica o processo da API; `/ready` verifica também a conexão com PostgreSQL. Os contratos estão em [API](api.md).

## Desenvolvimento por etapas

Consultar [cronograma](cronograma.md) e [progresso](progresso.md), escolher o próximo [prompt](prompts/README.md) e revisar o plano antes de implementar. Validar uma etapa antes de iniciar a seguinte. As regras permanentes ficam em [AGENTS.md](../AGENTS.md).

Resultados de execução, ajustes e pendências devem ser registrados em `progresso.md`, sem transformar o README principal em histórico de desenvolvimento.
