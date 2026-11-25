export type Readiness = { status: 'ready'; database: 'available' };

export async function getReadiness(signal?: AbortSignal): Promise<Readiness> {
  const response = await fetch('/api/ready', { signal });
  if (!response.ok) throw new Error('A API ou o banco de dados está indisponível.');
  const body: unknown = await response.json();
  if (
    typeof body !== 'object' || body === null ||
    !('status' in body) || body.status !== 'ready' ||
    !('database' in body) || body.database !== 'available'
  ) throw new Error('A API retornou uma resposta inesperada.');
  return { status: 'ready', database: 'available' };
}
