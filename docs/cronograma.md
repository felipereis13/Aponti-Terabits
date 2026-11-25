# Cronograma — cinco semanas

Capacidade de referência: uma pessoa com auxílio de IA, 20–30 horas semanais (100–150 horas no total). Contar semanas do início efetivo, não da geração deste documento. É um orçamento de trabalho, não garantia de prazo; configuração externa do GitHub deve começar cedo.

| Semana | Prompts e orçamento aproximado | Marco de saída |
|---|---|---|
| 1 | 01 Fundação (4–6h), 02 Laboratório (8–12h), 03 Contas (8–12h) | Publicação manual real via Actions/GHCR/SSH e login funcionando |
| 2 | 04 GitHub App (10–14h), 05 Projetos (5–8h), 06 Variáveis (5–8h) | Selecionar repo autorizado e cadastrar projeto com segredos cifrados |
| 3 | 07 Operações (5–8h), 08 Actions/GHCR (7–10h), 09 SSH/SFTP E2E (8–12h) | Clique em Deploy resulta em app acessível e status correto |
| 4 | 10 Histórico/rollback (6–9h), 11 Logs/exclusão (5–8h), 12 Recuperação (9–13h) | MVP funcional e recuperável de falhas/reinícios |
| 5 | 13 Validação (7–10h), 14 Auditoria/UX (7–10h), 15 Entrega (6–10h) | Instalação limpa e roteiro demonstrados |

Total máximo é aproximação: investigar riscos cedo e preservar a semana 5. Dependência sequencial: 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15.

## Uso dos prompts

Cada prompt tem seu plano e revisão de comportamentos antes da implementação. O aceite de uma etapa não autoriza automaticamente a próxima. Rodar verificações relevantes e atualizar `progresso.md` antes de seguir. Caso a etapa não passe, resolver as pendências sem mascarar falhas.

Configuração manual externa: iniciar Docker Desktop, criar repositório de exemplo no GitHub, registrar GitHub App, instalar nos repositórios e tornar a imagem de demonstração pública no GHCR. O agente prepara arquivos e instruções; não publica nem concede acesso externo sozinho.

## Controle de prazo

Se o GitHub App atrasar, validar SSH/Docker com o laboratório da etapa 02 enquanto resolve a configuração. Não substituir silenciosamente a experiência de conexão por token manual. Se o E2E não estiver pronto ao fim da semana 3, priorizar seu reparo antes de acabamento visual. Cortar somente melhorias opcionais, não autorização, testes, criptografia, idempotência ou rollback previsto no MVP.
