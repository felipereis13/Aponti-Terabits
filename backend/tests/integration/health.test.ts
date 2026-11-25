import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createDatabase } from '../../src/database/connection.js';

const database = createDatabase(process.env.TEST_DATABASE_URL!);
const app = createApp(database);
const unavailableDatabase = createDatabase('postgresql://terabits_test:unused@127.0.0.1:1/terabits_test');

beforeAll(async () => {
  await database.query('SELECT 1');
});

afterAll(async () => {
  await Promise.all([database.end(), unavailableDatabase.end()]);
});

describe('disponibilidade da plataforma', () => {
  it('quando a API está em execução, informa que o processo está disponível', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('quando o PostgreSQL real responde, informa que está pronta para receber operações', async () => {
    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ready', database: 'available' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('quando o PostgreSQL não responde, retorna 503 sem expor credenciais', async () => {
    const response = await request(createApp(unavailableDatabase)).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'not_ready', database: 'unavailable' });
  });

  it('quando o banco está indisponível, a verificação do processo continua respondendo', async () => {
    const response = await request(createApp(unavailableDatabase)).get('/health');
    expect(response.status).toBe(200);
  });

  it('quando a rota não existe, retorna um erro padronizado', async () => {
    const response = await request(app).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
