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

Permissões: Metadata read, Contents read e Actions write. Usar token de usuário para conferir acesso atual e tokens de instalação temporários limitados ao repositório nas operações do worker. Não conceder Contents write. Workflow usa seu próprio GITHUB_TOKEN com contents read e packages write para publicar. A imagem de demonstração será marcada pública no GHCR; não confundir autorização de repositório com autenticação de pull de imagem privada.

## Deploy

```text
Browser → API → PostgreSQL (operação QUEUED)
                   ↓
                worker → GitHub Actions → GHCR
                   ↓
               SSH/SFTP → VPS simulada → app HTTP
```

Worker será uma entrada separada do mesmo backend (`src/worker.ts`), com script próprio. Persistir estágio, run ID, tentativas, datas e erro sanitizado. Reivindicar operação com atualização atômica/lock curto. Não manter transação enquanto chama serviços externos. Começar com um worker e um executor SSH serial; não usar essa limitação como única proteção de concorrência.

Estados da operação: QUEUED → BUILDING → DEPLOYING → SUCCEEDED ou FAILED. Rollback vai de QUEUED a DEPLOYING. Projeto sem versão ativa é Não publicado; status da tentativa e versão ativa são apresentados separadamente. `activeDeploymentId` só muda após saúde confirmada.

POST de deploy/rollback exige Idempotency-Key UUID. Persistir fingerprint canônico do payload, escopo do usuário e tipo de operação na própria operação. Repetição idêntica retorna mesmo ID/202; payload diferente ou operação concorrente com outra chave retorna 409. Retenção da chave acompanha histórico do projeto.

Workflow recebe deploy_id e usa `run-name` com esse identificador. Persistir o run ID devolvido pelo dispatch quando disponível; se houver resposta sem run ID ou timeout ambíguo, reconciliar por workflow, ref e identificador antes de novo dispatch. Nunca adotar simplesmente o run mais recente. Consultar a cada 10 segundos, respeitando rate limits/backoff; timeout total inicial 20 minutos. Não fazer retry cego de efeitos externos.

Tag `ghcr.io/<owner>/<repo>:deploy-<uuid>` é única por operação. Impedir sobrescrita pelo fluxo; salvar digest e executar pull/run pelo digest confirmado. Não tratar tag como imutável apenas porque tem nome único.

## VPS e segredos

Etapa 02 adicionará VPS DinD com OpenSSH e volume Docker próprio, em profile `lab`, sem montar o socket Docker do host no backend. DinD exige modo privilegiado e é restrito ao laboratório local. Mapear SSH em 127.0.0.1:2222 e portas 4000–4020 na interface local. API/worker acessam hostname da VPS dentro da rede Compose quando containerizados. Não publicar Docker TCP.

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
