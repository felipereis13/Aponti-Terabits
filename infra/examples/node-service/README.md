# Serviço de demonstração

Node.js 24, sem dependências externas. `npm ci`, `npm test` e `npm start`.

Escuta em `0.0.0.0`, porta definida por `PORT` (padrão 3000). `/health` retorna versão e `DEMO_MESSAGE`, destinada apenas a texto público de demonstração, nunca segredos.

Copie somente esta pasta para um repositório público de teste autorizado. Dockerfile e workflow são gerados/mantidos pela Terabits, não precisam estar neste repositório.
