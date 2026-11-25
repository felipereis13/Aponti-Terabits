# Arquitetura

## Estado atual

Frontend e backend são projetos npm independentes. API Express é criada por `createApp(database)`; `server.ts` cuida de configuração, abertura da porta e encerramento. PostgreSQL tem pool limitado e timeouts. A prontidão usa `SELECT 1` com `pg`, sem modelo fictício para gerar Prisma Client. Prisma 6.19.3 fica fixado para CLI e client; modelos e migrations entram na etapa 03.

Vite encaminha `/api` para a API durante desenvolvimento. A hospedagem final manterá frontend/API na mesma origem. O navegador não recebe acesso direto ao banco nem credenciais de integrações.

## Organização incremental

Frontend: `pages` coordena telas; `features` concentra comportamento de uma funcionalidade; `components` contém peças reutilizáveis; `services` faz HTTP; `hooks` agrupa hooks realmente compartilhados. Não criar essas pastas vazias antecipadamente.

Backend: módulos `auth`, `github`, `projects`, `environment`, `deployments` e `logs`, criados quando necessários. Routes/middlewares tratam roteamento e autenticação; controllers adaptam HTTP; services decidem regras; repositories persistem; integrations encapsula Octokit e SSH/SFTP. Evitar uma arquitetura de interfaces sem consumidores.

## Identidade e GitHub

Senha com Argon2id; sessão opaca aleatória com hash no PostgreSQL, expiração e cookie HttpOnly/SameSite=Lax. Cookie Secure em produção; mutações validam token CSRF e origem. Login tem limite de tentativas. Não usar localStorage para credenciais. E-mail é normalizado antes da constraint única.

GitHub App: autorização do usuário e instalação são passos distintos. Callback OAuth usa `state` aleatório, de uso único, persistido e ligado à sessão; verificar código no servidor. Setup callback de instalação não comprova propriedade sozinho: consultar instalações e repositórios acessíveis com token do usuário. Persistir tokens de usuário/refresh cifrados, renovar quando aplicável e tratar revogação. Não permitir que duas contas locais vinculem a mesma identidade GitHub no MVP.

Permissões da GitHub App: Metadata read, Contents read e Actions write; leitura nos repositórios selecionados, dispatch/polling somente no repositório central da Terabits. Usuários não precisam configurar Actions nos próprios projetos. Instalação central é configurada pelo administrador e pode diferir da instalação do código-fonte. Não conceder Contents write. Credenciais de leitura do código, execução do build e escrita no GHCR ficam separadas. A imagem de demonstração será pública; configuração detalhada em [Build e publicação](build-publicacao.md).

## Deploy

```text
Browser → API → PostgreSQL (operação QUEUED)
                   ↓
                worker → Actions central da Terabits → GHCR da Terabits
                   ↓
               SSH/SFTP → VPS simulada → app HTTP
```

Worker será uma entrada separada do mesmo backend (`src/worker.ts`), com script próprio. Persistir estágio, run ID, tentativas, datas e erro sanitizado. Reivindicar operação com atualização atômica/lock curto. Não manter transação enquanto chama serviços externos. Começar com um worker e um executor SSH serial; não usar essa limitação como única proteção de concorrência.

Estados da operação: QUEUED → BUILDING → DEPLOYING → SUCCEEDED ou FAILED. Rollback vai de QUEUED a DEPLOYING. Projeto sem versão ativa é Não publicado; status da tentativa e versão ativa são apresentados separadamente. `activeDeploymentId` só muda após saúde confirmada.

POST de deploy/rollback exige Idempotency-Key UUID. Persistir fingerprint canônico do payload, escopo do usuário e tipo de operação na própria operação. Repetição idêntica retorna mesmo ID/202; payload diferente ou operação concorrente com outra chave retorna 409. Retenção da chave acompanha histórico do projeto.

Workflow `.github/workflows/build-app.yml` fica na Terabits, separado da CI da própria plataforma. Recebe deploy_id e build_spec JSON com commit de origem exato e configuração validada; usa run-name com deploy_id. Ref do workflow é da plataforma; branch/SHA de origem pertence ao app e não deve ser confundida com ela. Persistir run ID devolvido pelo dispatch quando disponível; em resposta ausente/ambígua, reconciliar no repositório central por workflow/ref/identificador antes de repetir. Consultar a cada 10 segundos, respeitando rate limits/backoff; timeout total inicial 20 minutos.

Imagem `ghcr.io/<namespace-terabits>/app-<projectId>:deploy-<deploymentId>`, independente do dono/nome do código-fonte, única por operação. Namespace vem do servidor. Salvar digest, SHA de origem, versão do gerador e snapshot da configuração de build. Publicar por digest confirmado; tag não é imutável apenas pelo nome. Detalhes de geração Docker, modos suportados e isolamento em [Build e publicação](build-publicacao.md).

## VPS e segredos

Etapa 02 entrega VPS DinD com OpenSSH e volumes próprios para Docker, aplicações e host keys, em profile `lab`, sem montar o socket Docker do host no backend. DinD exige modo privilegiado e é restrito ao laboratório local. SSH em 127.0.0.1:2222 e portas 4000–4020 na interface local. Engine interno atende somente pelo Unix socket, sem TCP. API/worker futuros usarão hostname da VPS dentro da rede Compose. Setup, validações e limites estão em [Laboratório de deploy](laboratorio.md).

SSH usa chave dedicada e fingerprint conhecido, nunca aceita host key automaticamente. Usuário dedicado tem acesso ao Docker da VPS de laboratório. Comandos remotos têm formato fixo e argumentos validados; nome de container/caminho é derivado de UUID de projeto, nunca nome livre ou texto do browser.

AES-256-GCM com chave de 32 bytes fora do banco/Git, IV aleatório de 12 bytes e auth tag; associar projeto e chave da variável como AAD. Chave mestra também protege tokens GitHub persistidos. Transferir `.env` de linha única por SFTP para pasta isolada, arquivo temporário 600 e rename atômico. Não gravar plaintext em arquivos locais, argumentos, logs ou variáveis públicas do frontend. Não suportar CR/LF/NUL nos valores no MVP.

Fazer pull antes de remover a versão antiga. Verificar saúde por HTTP até 60 segundos após iniciar. Se a troca falhar, tentar restaurar a imagem anterior com o arquivo de ambiente anterior preservado até a confirmação; manter FAILED e registrar se a recuperação funcionou. Não marcar Online com base apenas no retorno de `docker run`.

Reinício do worker reconcilia run ID, imagem/digest e labels do container. Nunca declarar uma operação ambígua concluída nem repetir publicação sem verificar o destino. Rollback manual cria nova operação, valida imagem de deploy bem-sucedido do mesmo projeto e usa variáveis atuais; informar que banco/volume não são restaurados.

## Referências técnicas

- [GitHub App: autorização de usuário](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [GitHub: workflow dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
- [PostgreSQL: índices parciais](https://www.postgresql.org/docs/17/indexes-partial.html)
- [Prisma 6: customização de migrations](https://docs.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features)
- [Docker-in-Docker oficial](https://github.com/docker-library/docs/blob/master/docker/README.md)

As versões efetivas ficam nos lockfiles. Confirmar contratos atuais dos serviços ao implementar a integração; não atualizar dependências por major junto com uma etapa funcional.
