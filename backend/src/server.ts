import { createApp } from './app.js';
import { readEnvironment } from './config/env.js';
import { createDatabase } from './database/connection.js';

const env = readEnvironment();
const database = createDatabase(env.DATABASE_URL);
const server = createApp(database).listen(env.PORT, env.HOST, () => {
  console.info(`Terabits API disponível em http://${env.HOST}:${env.PORT}`);
});

server.on('error', () => {
  console.error('Não foi possível iniciar o servidor HTTP. Verifique host e porta.');
  void database.end().finally(() => process.exit(1));
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 5000);
  timeout.unref();
  server.close(() => {
    void database.end().then(() => process.exit(0), () => process.exit(1));
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
