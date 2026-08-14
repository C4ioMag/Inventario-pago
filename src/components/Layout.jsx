import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, LogOut, Menu, Search, X } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function Layout() {
  const { logout, user } = useAuth();
  const { items, assets, teams } = useData();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const searchRef = useRef(null);
  const alertsRef = useRef(null);

  const lowStock = useMemo(
    () => items.filter((i) => Number(i.quantity) <= Number(i.min_quantity || 3)),
    [items]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hit = (v) => v && String(v).toLowerCase().includes(q);
    return [
      ...items.filter((i) => hit(i.name)).slice(0, 4)
        .map((i) => ({ id: i.id, label: i.name, sub: 'Item', to: '/itens' })),
      ...assets.filter((a) => hit(a.name) || hit(a.plate) || hit(a.vin) || hit(a.model)).slice(0, 4)
        .map((a) => ({ id: a.id, label: a.name, sub: `${a.tipo || 'Equipamento'}${a.plate ? ` · ${a.plate}` : ''}`, to: `/equipamentos/asset/${a.id}` })),
      ...teams.filter((t) => hit(t.name)).slice(0, 3)
        .map((t) => ({ id: t.id, label: t.name, sub: 'Equipe', to: '/equipes' })),
    ];
  }, [query, items, assets, teams]);

  useEffect(() => {
    function onClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (alertsRef.current && !alertsRef.current.contains(e.target)) setShowAlerts(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar desktop */}
      <div
        className="hidden shrink-0 transition-[width] duration-200 md:block"
        style={{ width: collapsed ? 68 : 232 }}
      >
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            <motion.div
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-[232px] md:hidden"
            >
              <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className="flex h-[60px] shrink-0 items-center gap-3 border-b px-4 md:px-6"
          style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => (window.innerWidth < 768 ? setMobileOpen(true) : setCollapsed((c) => !c))}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Alternar menu"
          >
            <Menu size={18} />
          </button>

          {/* Busca */}
          <div ref={searchRef} className="relative ml-auto w-full max-w-[280px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder="Buscar..."
              className="input-apple pl-9 pr-8 text-[13px]"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setShowResults(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
            {showResults && query.trim() && (
              <div className="card absolute right-0 top-[calc(100%+6px)] z-50 w-[320px] overflow-hidden p-1" style={{ boxShadow: 'var(--shadow-modal)' }}>
                {results.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Nada encontrado
                  </p>
                ) : (
                  results.map((r) => (
                    <button
                      key={`${r.sub}-${r.id}`}
                      onClick={() => { navigate(r.to); setQuery(''); setShowResults(false); }}
                      className="row-hover flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left"
                    >
                      <span className="truncate text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>{r.label}</span>
                      <span className="shrink-0 text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>{r.sub}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Alertas de estoque baixo */}
          <div ref={alertsRef} className="relative">
            <button
              onClick={() => setShowAlerts((s) => !s)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Alertas"
            >
              <Bell size={17} />
              {lowStock.length > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ background: 'var(--danger)' }}
                >
                  {lowStock.length}
                </span>
              )}
            </button>
            {showAlerts && (
              <div className="card absolute right-0 top-[calc(100%+6px)] z-50 w-[300px] overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
                <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Estoque baixo</p>
                </div>
                {lowStock.length === 0 ? (
                  <p className="px-4 py-5 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Nenhum alerta no momento
                  </p>
                ) : (
                  <div className="row-divide max-h-[300px] overflow-y-auto">
                    {lowStock.map((i) => (
                      <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="truncate text-[13px]" style={{ color: 'var(--text)' }}>{i.name}</span>
                        <span className="shrink-0 text-[13px] font-bold tabular-nums" style={{ color: 'var(--danger)' }}>
                          {i.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <ThemeToggle />

          <div className="flex items-center gap-2.5 border-l pl-3" style={{ borderColor: 'var(--border)' }}>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{user.name}</p>
              <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>Administrador</p>
            </div>
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title="Sair"
              aria-label="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
