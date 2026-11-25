// Nunca carregar .env de desenvolvimento nem usar DATABASE_URL neste processo.
process.env.NODE_ENV = 'test';
const connection = process.env.TEST_DATABASE_URL || 'postgresql://terabits_test:local-test-only@127.0.0.1:5433/terabits_test';
const url = new URL(connection);
if (
  !['postgresql:', 'postgres:'].includes(url.protocol) ||
  url.pathname !== '/terabits_test' || url.username !== 'terabits_test' ||
  !['127.0.0.1', 'localhost', 'postgres-test'].includes(url.hostname)
) throw new Error('Testes exigem PostgreSQL local, usuário terabits_test e banco terabits_test.');
process.env.TEST_DATABASE_URL = connection;
process.env.DATABASE_URL = connection;
