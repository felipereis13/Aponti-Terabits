# Trabalho no Terabits Deploy

## Objetivo e limite atual

Construir o MVP em cinco semanas, uma etapa por vez. A etapa inicial é somente a fundação executável e a documentação. Não implementar autenticação, GitHub ou deploy até receber o prompt correspondente. Consultar `docs/progresso.md` para o estado real; não confundir planejamento com funcionalidade entregue.

## Antes de cada etapa

1. Ler `README.md`, `docs/arquitetura.md`, `docs/fundamentos.md`, `docs/api.md`, `docs/banco-de-dados.md`, `docs/progresso.md` e o prompt solicitado.
2. Verificar o código e o estado do Git. Trabalhar em branch de etapa; preservar alterações do usuário. Não fazer push, publicar, alterar repositórios externos ou enviar mensagens sem autorização.
3. Mostrar o plano curto, arquivos envolvidos e frases dos testes em português antes de alterar código. Aguardar revisão do usuário, salvo se ele já tiver aprovado a implementação desse escopo no contexto atual.
4. Preparar cada migration para revisão antes de aplicar. Nunca executar migration, reset, limpeza ou teste em produção. Não aplicar automaticamente a migration junto com instalação, startup ou testes locais.

## Estrutura e stack

- `frontend/`: React + TypeScript + Vite + Tailwind + React Router; `backend/`: Express + TypeScript + Prisma + PostgreSQL. Projetos npm independentes, com lockfiles próprios. Sem workspaces e sem monorepo tooling adicional.
- `infra/`: laboratório VPS e templates. `docs/`: decisões, contratos e prompts. Usar `docker-compose.yml` na raiz.
- Backend modular: routes → controller → service → repository. Regras não pertencem aos controllers, componentes ou integrações. Evitar abstrações vazias e bibliotecas sem necessidade.
- Criar módulos quando necessários, não gerar todas as camadas de funcionalidades futuras na fundação.
- No PowerShell usar `npm.cmd` e `npx.cmd`. Node.js 24. Prisma CLI e client devem usar a mesma versão, atualmente 6.19.3; atualizações de major exigem uma tarefa própria.

## Fundamentos obrigatórios

- Nunca confiar no navegador: validar entradas, autenticação, propriedade, repositório autorizado, portas e transições de estado na API.
- Não retornar valores de segredos existentes. Não registrar senhas, tokens, cookies, chave SSH, chave mestra, `.env` ou URLs com credenciais. Não colocar segredos em `VITE_*`.
- Concorrência deve ser resolvida no PostgreSQL: constraints, operações atômicas e transações/locks curtos. Não manter transação aberta durante HTTP, SSH, build ou polling. Sem Redis ou lock em memória como garantia de exclusão.
- Idempotência em deploy/rollback: persistir chave e fingerprint da operação; mesma chave/conteúdo retorna a operação original, conteúdo diferente gera conflito.
- Sem promessa de exactly-once em APIs externas: reconciliar efeitos ambíguos antes de repetir workflow ou publicação.
- Testes de integração chamam rotas reais com PostgreSQL de teste real. Simular somente serviços externos. Não apagar, pular ou afrouxar testes para fazê-los passar.
- Refatorar em passos pequenos com testes do comportamento anterior. Não misturar refatoração com mudança de regra.

## Verificação e conclusão

- Rodar `npm.cmd run check` em `frontend/` e `backend/`. Backend exige o banco de teste saudável; ausência dele é bloqueio de ambiente, não aprovação dos testes.
- Validar Prisma com `npm.cmd run db:validate` em `backend/`, com DATABASE_URL local configurada.
- Atualizar os documentos afetados e `docs/progresso.md` com implementação, evidências, pendências e próximo prompt.
- Manter `README.md` como apresentação geral e guia de execução do projeto. Registrar atualizações em `docs/progresso.md` e detalhes técnicos em `docs/`, com índice em `docs/README.md`; não adicionar histórico de etapas ou resultados de verificações ao README principal.
- Explicar o que mudou e o que foi efetivamente verificado. Parar ao terminar a etapa; não iniciar a próxima sozinho.
