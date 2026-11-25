# Infraestrutura

`docker-compose.yml` na raiz contém PostgreSQL e a VPS Docker-in-Docker/OpenSSH no profile opcional `lab`. Não há motor de deploy na API.

Componentes da etapa 02:

- `vps/`: Docker-in-Docker com OpenSSH, host key conhecida, chave de cliente dedicada e armazenamento persistente. Profile `lab`, portas SSH 2222 e aplicações 4000–4020 locais.
- `templates/`: geradores Docker de serviço Node.js e site estático, mantidos na Terabits; não exigir cópia para projetos selecionados.
- `examples/`: fontes de serviço Node e site Vite sem Dockerfile/workflow para demonstrar preparação automática.
- `scripts/` e `tests/`: preparação segura de contexto, download público por SHA, build/publish e validações locais reais.
- `.github/workflows/build-app.yml`, na raiz da plataforma: protótipo central manual com fonte pública e SHA fixo, separado da CI. Integração autenticada/automática entra nas etapas 04/08. Sua execução remota depende de publicação/configuração externa autorizada.

Contrato dos modos, campos e isolamento de credenciais: [Build e publicação](../docs/build-publicacao.md). O repositório publicado contém somente o código e os arquivos normais de dependências; Dockerfile próprio é opcional em modo avançado.

Preparação, comandos, roteiro manual e testes: [Laboratório de deploy](../docs/laboratorio.md). Chaves privadas e artefatos de teste ficam em pastas ignoradas e não entram nas imagens.

Na etapa 15 serão adicionados Dockerfiles de frontend/backend e serviços da plataforma/worker no Compose. Não compartilhar o socket Docker do host com a API. Nunca executar `docker system prune` nem remover recursos fora dos identificadores gerenciados pelo laboratório.
