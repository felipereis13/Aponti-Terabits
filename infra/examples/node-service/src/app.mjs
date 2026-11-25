import { createServer } from 'node:http';

export function createApp() {
  return createServer((request, response) => {
    if (request.url !== '/health' && request.url !== '/') {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', version: '1.0.0', message: process.env.DEMO_MESSAGE || 'Olá, Terabits!' }));
  });
}
