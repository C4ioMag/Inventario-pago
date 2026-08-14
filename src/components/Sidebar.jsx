import { NavLink } from 'react-router-dom';
import {
  ClipboardList, Cog, FileBarChart, History,
  LayoutGrid, Package, Tags, Truck, Users,
} from 'lucide-react';

const GROUPS = [
  {
    items: [{ to: '/', label: 'Visão Geral', icon: LayoutGrid, end: true }],
  },
  {
    title: 'Inventário',
    items: [
      { to: '/itens', label: 'Itens', icon: Package },
      { to: '/equipamentos', label: 'Equipamentos', icon: Truck },
      { to: '/equipes', label: 'Equipes', icon: Users },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
      { to: '/historico', label: 'Histórico', icon: History },
      { to: '/categorias', label: 'Categorias', icon: Tags },
    ],
  },
];

export default function Sidebar({ collapsed, onNavigate }) {
  return (
    <aside
      className="flex h-full flex-col border-r"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
    >
      <div className={`flex h-[60px] shrink-0 items-center gap-2.5 border-b ${collapsed ? 'justify-center px-3' : 'px-5'}`}
        style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #1E40AF 100%)' }}
        >
          <ClipboardList size={17} color="#fff" strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <span className="text-[14px] font-bold tracking-wide" style={{ color: 'var(--text)' }}>
            INVENTÁRIO
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            {group.title && !collapsed && (
              <p className="label-caps mb-2 px-3">{group.title}</p>
            )}
            {group.title && collapsed && (
              <div className="mx-3 mb-2 border-t" style={{ borderColor: 'var(--border)' }} />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
        <NavItem to="/configuracoes" label="Configurações" icon={Cog} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </aside>
  );
}

function NavItem({ to, label, icon: Icon, end, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-lg text-[13.5px] font-medium transition-colors ${
        collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
      }`}
      style={({ isActive }) => ({
        background: isActive ? 'var(--accent-soft)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={17} strokeWidth={isActive ? 2.2 : 1.9} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}
