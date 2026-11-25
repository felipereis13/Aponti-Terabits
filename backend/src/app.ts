import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { Database } from './database/connection.js';

export function createApp(database: Database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/ready', async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      await database.query('SELECT 1');
      response.json({ status: 'ready', database: 'available' });
    } catch {
      response.status(503).json({ status: 'not_ready', database: 'unavailable' });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
  });

  const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
    if (status === 400 || status === 413) {
      response.status(status).json({ error: { code: 'INVALID_REQUEST', message: 'Corpo da requisição inválido ou muito grande.' } });
      return;
    }
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno.' } });
  };
  app.use(handleError);
  return app;
}
