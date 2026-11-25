# Fundamentos aplicados desde a base

O documento original contém exemplos de pagamentos, estoque e Supabase. Aqui os mesmos princípios são aplicados a deploys. Não adicionar pagamentos, Redis ou Supabase por causa dos exemplos.

| Fundamento | Aplicação na plataforma | Evidência esperada |
|---|---|---|
| Teste de integração | Request real contra Express com PostgreSQL de teste real | `npm.cmd test` chama rotas; banco e regras não são mockados |
| Nunca confiar no cliente | Sessão, propriedade, repositório autorizado, porta e estado decididos pela API | Usuário A não lê/altera projeto, variáveis, histórico ou logs de B |
| Race condition | Porta externa única, variável única por projeto/chave e uma operação ativa por projeto | Requisições com Promise.all não criam conflitos ou duplicatas |
| Idempotência | Chave persistida para deploy/rollback, fingerprint e reconciliação externa | Repetições sequenciais e simultâneas retornam uma única operação |
| Separação de responsabilidades | HTTP, regra, persistência, integrações e UI separados | Mudança de integração não espalha comandos SSH pelos controllers |

## Como trabalhar

1. Usar branch por etapa; nada direto na main.
2. Mostrar plano e frases `quando…, então…` dos testes antes da implementação e obter revisão, salvo escopo já aprovado.
3. Preparar migrations e explicar constraints/impacto. Aguardar revisão antes de aplicar, mesmo localmente. Nunca tocar banco de produção para validar a etapa.
4. Testar caminho feliz, acesso indevido, erro esperado, limite e repetição quando aplicável.
5. Rodar verificações e registrar o resultado real; não substituir erro de ambiente por teste com mock.

## Garantias concretas

- Preferência: unique constraint, operação atômica, depois transação com SELECT FOR UPDATE se necessário. Sempre conferir linhas afetadas e tratar conflito esperado como 409, não 500.
- Desabilitar botão melhora UX; não protege o banco contra chamadas diretas.
- Não abrir transação ao redor de build, SSH ou polling. Persistência local e efeito externo não formam uma transação única: tratar timeout ambíguo como estado a reconciliar.
- Valores protegidos não voltam para o browser para serem mascarados; a API entrega somente chaves/metadados. Chaves/tokens nunca usam prefixo VITE_.
- Testes usam banco temporário separado e não leem `.env` de desenvolvimento. Somente as integrações de terceiros podem ser simuladas.
- Antes de refatorar código existente, registrar seu comportamento. Não corrigir bug e refatorar arquitetura no mesmo passo.
- Proibido apagar, skipar ou afrouxar teste por conveniência. Se a expectativa parecer incorreta, pedir revisão e explicar o conflito.

## Auditoria final

Executar nesta ordem: testes de integração, confiança no cliente, concorrência, idempotência e separação. Registrar achado, risco, arquivo/linha e correção. Ausência de evidência deve constar como não verificado. Não fazer auditoria virar implementação de features fora do MVP.
