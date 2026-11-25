import pg from 'pg';

export function createDatabase(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 10000,
    query_timeout: 2000,
    statement_timeout: 2000,
  });
  pool.on('error', () => {
    console.error('Uma conexão ociosa com o PostgreSQL foi interrompida.');
  });
  return pool;
}

export type Database = ReturnType<typeof createDatabase>;
