import { NavLink, Outlet } from 'react-router-dom';
import { LogOut, Package } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-30 border-b" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'blur(20px)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[11px]"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #0040DD 100%)' }}
            >
              <Package size={18} color="white" strokeWidth={2.3} />
            </div>
            <span className="text-[16px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Estoque</span>
          </div>

          <nav className="flex items-center gap-1 rounded-full p-1" style={{ background: 'var(--bg-secondary)' }}>
            <Tab to="/">Estoque</Tab>
            <Tab to="/invoices">Invoices</Tab>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={logout}
              className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full"
              title={`Sair (${user.name})`}
              aria-label="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-200 ${isActive ? '' : ''}`
      }
      style={({ isActive }) => ({
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        color: isActive ? 'var(--text)' : 'var(--text-secondary)',
        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
      })}
    >
      {children}
    </NavLink>
  );
}
