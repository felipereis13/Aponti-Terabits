# Infraestrutura

Nesta etapa, `docker-compose.yml` na raiz contém somente PostgreSQL de desenvolvimento e teste. Não há VPS nem motor de deploy implementados.

Na etapa 02 serão criados:

- `vps/`: Docker-in-Docker com OpenSSH, host key conhecida, chave de cliente dedicada e armazenamento persistente. Profile `lab`, portas SSH 2222 e aplicações 4000–4020 locais.
- `templates/`: Dockerfile, workflow `workflow_dispatch` e aplicação Node mínima de exemplo com `/health`, versão e variável não sensível. Não publicar segredos numa rota de demonstração.

Na etapa 15 serão adicionados Dockerfiles de frontend/backend e serviços da plataforma/worker no Compose. Não compartilhar o socket Docker do host com a API. Nunca executar `docker system prune` nem remover recursos fora dos identificadores gerenciados pelo laboratório.
