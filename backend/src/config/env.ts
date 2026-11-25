import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.url().refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol)),
});

export function readEnvironment() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // Não incluir os valores fornecidos: DATABASE_URL pode conter credenciais.
    const fields = result.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Configuração inválida: ${fields.join(', ')}. Consulte backend/.env.example.`);
  }
  return result.data;
}
