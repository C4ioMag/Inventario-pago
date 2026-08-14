import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Boxes, Package, Truck, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge, { itemStatus } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { cumulativeSeries, dailySeries, movementKind, movementsThisMonth } from '../lib/movements';
import { fmtDateTime } from '../lib/format';

export default function Overview() {
  const { items, assets, teams, movements, registries, loading } = useData();
  const navigate = useNavigate();

  const monthMovements = useMemo(() => movementsThisMonth(movements), [movements]);

  const categoryName = useMemo(() => {
    const map = new Map(registries.categories.map((c) => [c.id, c.name]));
    return (id) => (id ? map.get(id) || '—' : '—');
  }, [registries.categories]);

  const locationName = useMemo(() => {
    const map = new Map(registries.locations.map((l) => [l.id, l.name]));
    return (id) => (id ? map.get(id) || '—' : '—');
  }, [registries.locations]);

  const teamName = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id) => (id ? map.get(id) || '—' : 'Geral');
  }, [teams]);

  const totalUnits = useMemo(
    () => items.reduce((s, i) => s + Number(i.quantity), 0),
    [items]
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Visão Geral" subtitle="Acompanhe seu inventário em tempo real" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[140px]" />)}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="skeleton h-[320px]" />
          <div className="skeleton h-[320px]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Visão Geral" subtitle="Acompanhe seu inventário em tempo real" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="Total de itens"
          value={items.length.toLocaleString('pt-BR')}
          sub={`${totalUnits.toLocaleString('pt-BR')} unidades em estoque`}
          color="var(--accent)"
          trend={cumulativeSeries(items)}
          delay={0}
        />
        <StatCard
          icon={Truck}
          label="Total de equipamentos"
          value={assets.length.toLocaleString('pt-BR')}
          sub="Equipamentos cadastrados"
          color="var(--ok)"
          trend={cumulativeSeries(assets)}
          delay={0.05}
        />
        <StatCard
          icon={Users}
          label="Equipes"
          value={teams.length.toLocaleString('pt-BR')}
          sub="Equipes ativas"
          color="var(--violet)"
          trend={cumulativeSeries(teams)}
          delay={0.1}
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Movimentações (mês)"
          value={monthMovements.length.toLocaleString('pt-BR')}
          sub="Entradas e saídas"
          color="var(--warn)"
          trend={dailySeries(movements)}
          delay={0.15}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Inventário de Itens" to="/itens">
          {items.length === 0 ? (
            <EmptyState icon={Package} title="Nenhum item cadastrado" hint="Cadastre itens na área Inventário › Itens." />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th><th>Categoria</th><th>Equipe</th><th className="!text-right">Qtd</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 5).map((i) => (
                  <tr key={i.id} className="cursor-pointer" onClick={() => navigate('/itens')}>
                    <td className="cell-strong">{i.name}</td>
                    <td>{categoryName(i.category_id)}</td>
                    <td>{teamName(i.team_id)}</td>
                    <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{i.quantity}</td>
                    <td><StatusBadge status={itemStatus(i)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {items.length > 5 && <PanelFooter to="/itens">Ver todos os itens</PanelFooter>}
        </Panel>

        <Panel title="Inventário de Equipamentos" to="/equipamentos">
          {assets.length === 0 ? (
            <EmptyState icon={Truck} title="Nenhum equipamento cadastrado" hint="Cadastre em Inventário › Equipamentos." />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Equipamento</th><th>Categoria</th><th>Equipe</th><th>Status</th><th>Local</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 5).map((a) => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/equipamentos/asset/${a.id}`)}>
                    <td className="cell-strong">{a.name}</td>
                    <td>{a.tipo || categoryName(a.category_id)}</td>
                    <td>{teamName(a.team_id)}</td>
                    <td><StatusBadge status={a.status || 'disponivel'} /></td>
                    <td>{locationName(a.location_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {assets.length > 5 && <PanelFooter to="/equipamentos">Ver todos os equipamentos</PanelFooter>}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Movimentações Recentes" to="/historico">
          {movements.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="Nenhuma movimentação registrada"
              hint="Toda entrada, saída, transferência e troca de peça aparece aqui automaticamente."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Data</th><th>Tipo</th><th>Descrição</th><th>Equipe</th><th>Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 8).map((m) => {
                    const k = movementKind(m.kind);
                    return (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap tabular-nums">{fmtDateTime(m.created_at)}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium" style={{ color: k.color }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.color }} />
                            {k.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text)' }}>{m.description}</td>
                        <td>{m.team_name || 'Geral'}</td>
                        <td>{m.user_name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {movements.length > 8 && <PanelFooter to="/historico">Ver histórico completo</PanelFooter>}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, to, children }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-[14.5px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
        {to && (
          <Link
            to={to}
            className="rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Ver todos
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function PanelFooter({ to, children }) {
  return (
    <Link
      to={to}
      className="row-hover block border-t py-3 text-center text-[13px] font-medium"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
    >
      {children}
    </Link>
  );
}
