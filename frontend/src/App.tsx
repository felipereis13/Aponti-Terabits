import { NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <NavLink to="/" className="font-semibold tracking-tight">terabits<span className="text-emerald-400"> / deploy</span></NavLink>
          <nav aria-label="Navegação principal"><NavLink to="/" className="text-sm text-stone-300">Visão geral</NavLink></nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl">Página não encontrada</h1><NavLink to="/" className="text-emerald-400">Voltar ao início</NavLink></main>} />
      </Routes>
    </div>
  );
}
