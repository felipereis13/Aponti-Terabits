# Cronograma — cinco semanas

Capacidade de referência: uma pessoa com auxílio de IA, 20–30 horas semanais (100–150 horas no total). Contar semanas do início efetivo, não da geração deste documento. É um orçamento de trabalho, não garantia de prazo; configuração externa do GitHub deve começar cedo.

| Semana | Prompts e orçamento aproximado | Marco de saída |
|---|---|---|
| 1 | 01 Fundação (4–6h), 02 Laboratório e geradores (10–14h), 03 Contas (6–10h) | Workflow central manual constrói app sem arquivos de deploy e publica no laboratório; login funciona |
| 2 | 04 GitHub App (8–12h), 05 Projetos/configuração de build (7–10h), 06 Variáveis (5–8h) | Selecionar repo autorizado e configurar serviço Node ou site Vite pela interface |
| 3 | 07 Operações (5–8h), 08 Workflow central/GHCR (9–12h), 09 SSH/SFTP E2E (6–10h) | Clique em Deploy constrói origem no Actions central e coloca app no ar |
| 4 | 10 Histórico/rollback (6–9h), 11 Logs/exclusão (5–8h), 12 Recuperação (9–13h) | MVP funcional e recuperável de falhas/reinícios |
| 5 | 13 Validação (7–10h), 14 Auditoria/UX (7–10h), 15 Entrega (6–10h) | Instalação limpa e roteiro demonstrados |

Total máximo é aproximação: investigar riscos cedo e preservar a semana 5. Dependência sequencial: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15.

## Uso dos prompts

Cada prompt tem seu plano e revisão de comportamentos antes da implementação. O aceite de uma etapa não autoriza automaticamente a próxima. Rodar verificações relevantes e atualizar `progresso.md` antes de seguir. Caso a etapa não passe, resolver as pendências sem mascarar falhas.

Configuração manual externa: iniciar Docker Desktop, criar repositórios de exemplo contendo somente código/package.json/lockfile, disponibilizar workflow central no repositório Terabits, registrar GitHub App e instalar tanto na origem quanto no repo central. Configurar credenciais administrativas e tornar públicas as imagens de demonstração autorizadas no namespace GHCR da Terabits. O agente prepara arquivos e instruções; não publica nem concede acesso externo sozinho.

O suporte automático inicial fica em Node.js/npm e sites React/Vite/npm, com Dockerfile opcional em modo avançado. Não implementar detecção universal, outros package managers ou segredos em build nesta janela. A centralização aumenta o trabalho de geradores/isolamento nas etapas 02/08; as horas continuam estimativas e a semana 5 deve permanecer reservada para validação.

## Controle de prazo

Se o GitHub App atrasar, validar SSH/Docker com o laboratório da etapa 02 enquanto resolve a configuração. Não substituir silenciosamente a experiência de conexão por token manual. Se o E2E não estiver pronto ao fim da semana 3, priorizar seu reparo antes de acabamento visual. Cortar somente melhorias opcionais, não autorização, testes, criptografia, idempotência ou rollback previsto no MVP.
