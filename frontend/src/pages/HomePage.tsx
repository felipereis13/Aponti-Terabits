import { useCallback, useEffect, useRef, useState } from 'react';
import { getReadiness } from '../services/api';

type Connection = 'loading' | 'ready' | 'unavailable';

export function HomePage() {
  const [connection, setConnection] = useState<Connection>('loading');
  const request = useRef<AbortController | null>(null);

  const verify = useCallback((controller: AbortController) => {
    void getReadiness(AbortSignal.any([controller.signal, AbortSignal.timeout(6000)])).then(
      () => { if (!controller.signal.aborted) setConnection('ready'); },
      () => { if (!controller.signal.aborted) setConnection('unavailable'); },
    );
  }, []);

  function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setConnection('loading');
    void verify(controller);
  }

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    void verify(controller);
    return () => controller.abort();
  }, [verify]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Etapa 01 · Fundação</p>
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">Um lugar para colocar<br />suas ideias no ar.</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-400">A base da Terabits Deploy está pronta para evoluir. Os próximos passos são contas, conexão com o GitHub e publicação de aplicações.</p>
      <section aria-labelledby="connection-title" className="mt-12 rounded-2xl border border-white/10 bg-white/2.5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="connection-title" className="text-lg font-medium">Conexão com a plataforma</h2>
            <p className="mt-1 text-sm text-stone-400">Disponibilidade da API e do PostgreSQL.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={connection === 'loading'} className="rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:border-emerald-400 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-wait disabled:opacity-50">Verificar conexão</button>
        </div>
        <p role="status" aria-live="polite" className="mt-6 flex items-center gap-3 text-sm">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${connection === 'ready' ? 'bg-emerald-400' : connection === 'loading' ? 'bg-amber-300' : 'bg-red-400'}`} />
          {connection === 'ready' ? 'API e banco disponíveis' : connection === 'loading' ? 'Verificando conexão…' : 'Conexão indisponível. Verifique se a API e o banco estão em execução.'}
        </p>
      </section>
    </main>
  );
}
