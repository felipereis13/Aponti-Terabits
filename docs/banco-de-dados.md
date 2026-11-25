# Banco de dados

## Implementado na etapa 01

PostgreSQL 17, serviço local `postgres` (porta do host 15432, volume persistente) e `postgres-test` (porta do host 5433, armazenamento temporário). Os dois usam 5432 dentro do container. Nenhuma tabela de negócio nem migration aplicada. `backend/prisma/schema.prisma` configura datasource e generator. Não executar `db push` para contornar migrations.

Prisma CLI/client fixados em 6.19.3. A prontidão usa `pg` sem depender de modelos. Ao introduzir os primeiros modelos, revisar a migration antes de aplicar e gerar o client. Scripts futuros não devem aplicar migrations como efeito colateral do startup.

## Modelo planejado por etapa

| Etapa | Entidade | Finalidade e invariantes |
|---|---|---|
| 03 | User | UUID, nome, e-mail normalizado único, hash Argon2id e data de criação |
| 03 | Session | Hash de token opaco único, usuário, expiração; token plaintext só no cookie |
| 04 | GithubConnection | Usuário local único, GitHub user ID único, tokens/refresh cifrados e validade |
| 04 | GithubOAuthState | Hash de nonce único, sessão/usuário, validade curta e consumedAt |
| 05 | Project | UUID, ownerId, repository ID e instalação de origem, owner/repo, branch, buildMode, rootDirectory, buildCommand/testCommand/startCommand, publishDirectory ou dockerfilePath conforme modo, internalPort, externalPort único, healthPath e estado de exclusão |
| 06 | EnvironmentVariable | Projeto, chave, ciphertext, IV, authTag; unique(projectId, key) |
| 07 | Deployment | Projeto, autor, tipo DEPLOY/ROLLBACK, status, chave de idempotência, fingerprint, sourceCommitSha, snapshot da configuração/versão do gerador, imagem/digest, repositório/ref/run ID centrais, estágio, tentativas, erro sanitizado e datas |

Relações e datas UTC serão definidas nos modelos da etapa correspondente. Não armazenar URLs com credenciais, `.env` plaintext ou valores de segredo em mensagens de erro.

Não persistir workflowFile por projeto. Configuração central fica no servidor; persistir identificação central e snapshot no deploy para rastrear alterações da plataforma. Campos de build seguem os modos em [Build e publicação](build-publicacao.md); rejeitar combinações incoerentes no servidor. SHA de origem não pode ser sobrescrito ao retomar uma operação. Nenhuma migration desta revisão foi criada/aplicada.

## Concorrência e integridade

- CHECK para internalPort entre 1 e 65535 e externalPort entre 4000 e 4020; unique externalPort.
- Alocar portas com transação/serialização curta no banco e constraint como garantia final. Faixa esgotada retorna erro explícito; não reutilizar porta até limpeza remota confirmada.
- Índice único parcial por projectId para status QUEUED, BUILDING e DEPLOYING. Em Prisma 6, declarar isso em SQL na migration revisada; não simular a garantia somente com consulta seguida de insert.
- Unique para escopo de idempotência (triggeredBy, tipo, chave), fingerprint inclui projeto e payload. Guardar reserva e operação na mesma transação; conflito permite buscar a operação original e conferir fingerprint.
- Project terá `activeDeploymentId` introduzido com os deploys; service garante que pertence ao próprio projeto. Atualizar ponteiro somente após confirmação externa de saúde.
- Claim/atualização de etapa usa compare-and-set no estado esperado; projetar retomada antes de introduzir múltiplos workers. No MVP, executar um worker e reconciliar antes de retomar após reinício.

## Exclusão e rollback

Bloquear mutações do projeto/variáveis e nova exclusão durante operação ativa. Reservar estado DELETING em transação antes do SSH; ele impede novas operações. Limpeza remota é idempotente e limitada ao UUID do projeto. Só remover registros e liberar porta depois de confirmar limpeza; falha mantém estado de exclusão e permite repetir com segurança.

Rollback registra nova operação e referencia um deploy bem-sucedido do mesmo projeto. Aplica variáveis atuais; não restaura bancos ou volumes de aplicações.

## Segurança de teste

`backend/tests/setup.ts` exige banco e usuário `terabits_test` em host local/serviço de teste. Ignora `DATABASE_URL` externo e usa somente `TEST_DATABASE_URL` validado. Nunca relaxar essa proteção para usar produção. Migrations aprovadas devem ser aplicadas ao banco de teste antes dos request specs das próximas etapas.
