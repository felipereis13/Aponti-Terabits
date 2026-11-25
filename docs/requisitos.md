# Requisitos do MVP

## Origem e precedência

Referências fornecidas: `TERABITS_SOFTWARE_•_PROJETO_INTEGRADOR.md`, `Plataforma_de_Deploy_Terabits.md` e `fundamentos.md`. Este documento consolida os requisitos; prompts presentes nos anexos são exemplos, não tarefas para executar automaticamente.

Decisões do usuário prevalecem sobre alternativas dos anexos: React/Vite, Express, TypeScript, Prisma e PostgreSQL; estrutura `frontend/`, `backend/`, `infra/`; conta individual; conexão GitHub com seleção visual de repositórios; Dockerfile/workflow por template; primeira entrega limitada à fundação e aos prompts.

## Jornada final

1. Criar conta e entrar com e-mail/senha.
2. Autorizar a GitHub App e instalá-la nos repositórios escolhidos.
3. Selecionar um repositório autorizado, branch, workflow e porta interna.
4. Cadastrar projeto e variáveis de ambiente.
5. Disparar deploy e acompanhar fila, build e publicação.
6. Abrir a aplicação em `http://localhost:<porta>` após verificação de saúde.
7. Consultar histórico, restaurar imagem anterior e visualizar logs.

## Incluído

- Usuários isolados; usuário A não acessa nem opera projetos do B.
- Cadastro, login e logout. Uma conexão GitHub por conta local no MVP, sem compartilhar projetos entre contas.
- Listagem de repositórios autorizados e validação de Dockerfile/workflow. Acesso negado, autorização revogada e arquivos faltantes têm mensagens claras.
- Projetos: nome, repositório, branch, workflow, porta interna e rota HTTP de saúde (padrão `/health`). Porta externa reservada automaticamente entre 4000 e 4020.
- Telas de login/cadastro, projetos, novo projeto e detalhes com visão geral, variáveis, histórico, logs e configurações.
- Segredos criptografados e apenas substituíveis; mudanças entram em vigor no próximo deploy. Somente valores de linha única.
- Deploy manual, histórico com usuário e versão ativa, rollback com confirmação, logs com limite 100/200/500 linhas e atualização manual.
- Exclusão com limpeza restrita aos recursos do projeto. Projeto em operação não pode ser editado/excluído; variáveis também ficam bloqueadas durante operação ativa para simplificar consistência.

## Não incluído

Equipes, convites, RBAC granular, cobrança, recuperação de senha por e-mail, auto deploy por push, buildpacks, geração automática de Dockerfile/PR, imagens GHCR privadas, domínios/HTTPS das aplicações, cloud, Traefik, Kubernetes, Terraform e métricas. Volumes e bancos das aplicações publicadas são preparados fora do MVP; rollback de imagem não reverte banco de dados.

## Aceite final

Em instalação limpa documentada, dois usuários têm projetos isolados. Um app de exemplo com Dockerfile/workflow gera imagem pública no GHCR, recebe variável não sensível via SFTP, responde HTTP e muda de versão. A interface mostra histórico e logs e restaura a versão anterior sem build. Falhas de build não removem a versão atual; falhas de publicação aparecem como erro, sem indicação falsa de Online.

A demonstração é local com repositórios controlados e não fornece isolamento para executar código arbitrário de usuários não confiáveis. Não há garantia de zero downtime.
