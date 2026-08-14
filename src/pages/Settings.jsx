import { Database, HardDrive, Moon, Sun, User } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

export default function Settings() {
  const { dbConnected, items, assets, movements, teams } = useData();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-[760px]">
      <PageHeader title="Configurações" subtitle="Conta, aparência e armazenamento dos dados" />

      <Card icon={User} title="Conta">
        <Row label="Nome" value={user.name} />
        <Row label="Email" value={user.email} />
        <Row label="Perfil" value="Administrador" />
      </Card>

      <Card icon={theme === 'dark' ? Moon : Sun} title="Aparência" className="mt-4">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <p className="text-[13.5px]" style={{ color: 'var(--text)' }}>Tema</p>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              {theme === 'dark' ? 'Escuro' : 'Claro'}
            </p>
          </div>
          <button onClick={toggleTheme} className="btn-ghost px-3.5 py-2 text-[13px]">
            Mudar para {theme === 'dark' ? 'claro' : 'escuro'}
          </button>
        </div>
      </Card>

      <Card icon={dbConnected ? Database : HardDrive} title="Armazenamento" className="mt-4">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: dbConnected ? 'var(--ok)' : 'var(--warn)' }}
            />
            <p className="text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
              {dbConnected ? 'Conectado ao banco de dados (Supabase)' : 'Salvando neste navegador'}
            </p>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {dbConnected
              ? 'Os dados ficam salvos na nuvem e podem ser acessados de qualquer computador.'
              : 'Sem o Supabase configurado, os dados ficam apenas neste navegador. Para acessar de outros dispositivos, configure as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY e rode o supabase-setup.sql.'}
          </p>
        </div>
        <div className="grid grid-cols-2 border-t sm:grid-cols-4" style={{ borderColor: 'var(--border)' }}>
          <Stat label="Itens" value={items.length} />
          <Stat label="Equipamentos" value={assets.length} divider />
          <Stat label="Equipes" value={teams.length} divider />
          <Stat label="Movimentações" value={movements.length} divider />
        </div>
      </Card>
    </div>
  );
}

function Card({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
        <Icon size={16} style={{ color: 'var(--text-secondary)' }} />
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
      </div>
      <div className="row-divide">{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, divider }) {
  return (
    <div className="px-5 py-3.5" style={divider ? { borderLeft: '1px solid var(--border)' } : undefined}>
      <p className="text-[19px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="label-caps mt-0.5">{label}</p>
    </div>
  );
}
