# Requisitos do MVP

## Origem e precedência

Referências fornecidas: `TERABITS_SOFTWARE_•_PROJETO_INTEGRADOR.md`, `Plataforma_de_Deploy_Terabits.md` e `fundamentos.md`. Este documento consolida os requisitos; prompts presentes nos anexos são exemplos, não tarefas para executar automaticamente.

Decisões do usuário prevalecem sobre alternativas dos anexos: React/Vite, Express, TypeScript, Prisma e PostgreSQL; estrutura `frontend/`, `backend/`, `infra/`; conta individual; conexão GitHub com seleção visual de repositórios; preparação Docker automática e workflow central na Terabits, sem exigir arquivos de deploy nos projetos; primeira entrega limitada à fundação e aos prompts. A centralização substitui a escolha anterior de copiar templates para cada repositório.

## Jornada final

1. Criar conta e entrar com e-mail/senha.
2. Autorizar a GitHub App e instalá-la nos repositórios escolhidos.
3. Selecionar repositório autorizado e branch; informar tipo de aplicação, comandos e porta quando aplicável.
4. Cadastrar projeto e variáveis de ambiente.
5. Disparar deploy e acompanhar fila, build e publicação.
6. Abrir a aplicação em `http://localhost:<porta>` após verificação de saúde.
7. Consultar histórico, restaurar imagem anterior e visualizar logs.

## Incluído

- Usuários isolados; usuário A não acessa nem opera projetos do B.
- Cadastro, login e logout. Uma conexão GitHub por conta local no MVP, sem compartilhar projetos entre contas.
- Listagem de repositórios autorizados, sem exigir Dockerfile nem workflow. Acesso negado, autorização revogada e arquivos necessários ao modo escolhido ausentes têm mensagens claras.
- Modos iniciais: serviço Node.js/npm e site estático React/Vite/npm com configuração Docker gerada pela Terabits; Dockerfile próprio é opcional em modo avançado. Yarn/pnpm, dependências privadas, outros geradores automáticos e builds com segredos ficam para evolução.
- Projetos: nome, repositório, branch, diretório raiz e configuração de build/start conforme o modo, porta interna e rota de saúde. Faixa externa 4000–4020 reservada automaticamente. Workflow/registry são configurações da plataforma, não campos do projeto. Detalhes em [Build e publicação](build-publicacao.md).
- Telas de login/cadastro, projetos, novo projeto e detalhes com visão geral, variáveis, histórico, logs e configurações.
- Segredos de execução dos serviços criptografados e apenas substituíveis; mudanças entram em vigor no próximo deploy. Somente valores de linha única. Sites estáticos não recebem segredos runtime nem variáveis de build nesta versão.
- Deploy manual, histórico com usuário e versão ativa, rollback com confirmação, logs com limite 100/200/500 linhas e atualização manual.
- Exclusão com limpeza restrita aos recursos do projeto. Projeto em operação não pode ser editado/excluído; variáveis também ficam bloqueadas durante operação ativa para simplificar consistência.

## Não incluído

Equipes, convites, RBAC granular, cobrança, recuperação de senha por e-mail, auto deploy por push, buildpacks genéricos, alterações/PRs nos repositórios selecionados, imagens GHCR privadas, domínios/HTTPS das aplicações, cloud, Traefik, Kubernetes, Terraform e métricas. A geração Docker é limitada aos modos iniciais documentados. Volumes e bancos das aplicações publicadas são preparados fora do MVP; rollback de imagem não reverte banco de dados.

## Aceite final

Em instalação limpa documentada, dois usuários têm projetos isolados. Um serviço Node e um site React/Vite sem Dockerfile/workflow são publicados pelo workflow central da Terabits, com imagem pública no namespace GHCR da plataforma e commit rastreável. O serviço recebe variável não sensível via SFTP. A interface mostra histórico e logs e restaura a versão anterior sem build. Falhas de build não removem a versão atual; falhas de publicação aparecem como erro, sem indicação falsa de Online. O modo Dockerfile opcional também tem validação própria.

A demonstração é local com repositórios controlados e não fornece isolamento para executar código arbitrário de usuários não confiáveis. Não há garantia de zero downtime.
