# Terabits Deploy

Plataforma web para centralizar a publicação de aplicações a partir de repositórios do GitHub. O projeto busca simplificar o deploy em infraestrutura própria, reunindo configuração de aplicações, variáveis de ambiente, acompanhamento de publicações, histórico, rollback e logs em uma interface.

## Como funciona

O fluxo previsto para a plataforma é:

1. Criar uma conta e conectar o GitHub.
2. Selecionar um repositório com Dockerfile e workflow de publicação.
3. Configurar a aplicação e suas variáveis de ambiente.
4. Solicitar o deploy pela interface.
5. Acompanhar os testes e o build no GitHub Actions.
6. Publicar a imagem do GHCR no servidor de destino via SSH/SFTP.
7. Acessar a aplicação, consultar logs e restaurar uma versão anterior quando necessário.

O ambiente local utiliza Docker para simular o servidor de destino. O projeto está em desenvolvimento; as funcionalidades disponíveis e as entregas planejadas estão registradas em [progresso](docs/progresso.md).

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Interface | React, TypeScript, Vite, Tailwind CSS e React Router |
| API | Node.js, TypeScript e Express |
| Banco de dados | PostgreSQL e Prisma ORM |
| Testes | Vitest e Supertest |
| Infraestrutura | Docker e Docker Compose |
| Integrações de publicação previstas | GitHub App, GitHub Actions, GHCR e SSH/SFTP |

## Pré-requisitos

- Node.js **24.x** e npm.
- Git.
- Docker com suporte a containers Linux. No Windows, usar Docker Desktop com WSL2 e aguardar o Engine iniciar.
- Internet para instalar dependências e baixar as imagens Docker.
- Portas locais disponíveis: **5173** para a interface, **3001** para a API, **15432** para o PostgreSQL e **5433** para o banco de testes.

## Executar localmente

Os comandos abaixo usam PowerShell. Em Linux/macOS, substituir `npm.cmd` por `npm` e `Copy-Item` por `cp`.

### 1. Configurar o ambiente

Na raiz do projeto, criar os arquivos de configuração a partir dos exemplos, caso ainda não existam:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Se já houver arquivos `.env`, preservar seus valores e comparar com os exemplos em vez de sobrescrevê-los. As configurações fornecidas são exclusivas do ambiente local.

### 2. Iniciar o banco de dados

Com o Docker em execução:

```powershell
docker compose up -d --wait postgres
```

### 3. Iniciar a API

Em um terminal, a partir da raiz:

```powershell
cd backend
npm.cmd ci
npm.cmd run dev
```

### 4. Iniciar a interface

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Abrir **[http://127.0.0.1:5173](http://127.0.0.1:5173)**. A tela inicial permite verificar a conexão com a API e o banco. A API responde diretamente em `http://127.0.0.1:3001`; o frontend encaminha as chamadas por `/api` durante o desenvolvimento.

### 5. Encerrar o ambiente

Encerrar os processos da interface e da API com `Ctrl+C`. Na raiz, parar os containers:

```powershell
docker compose --profile test down
```

Os dados do banco de desenvolvimento permanecem no volume Docker. O banco de testes é temporário.

## Estrutura

```text
terabitsDeploy/
├── frontend/           Interface web
├── backend/            API, persistência e testes
├── infra/              Configurações de infraestrutura e templates
├── docs/               Documentação e acompanhamento do desenvolvimento
├── .github/workflows/  Automação de verificações
├── AGENTS.md           Orientações para agentes de desenvolvimento
├── docker-compose.yml Serviços locais
└── README.md
```

Frontend e backend têm dependências e lockfiles independentes. Executar os comandos npm dentro da pasta correspondente.

## Documentação

O [índice da documentação](docs/README.md) reúne os guias técnicos, requisitos, planejamento e registros de atualizações. Para testes, builds, configuração e solução de problemas, consultar o [guia de desenvolvimento](docs/desenvolvimento.md).
