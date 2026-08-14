import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Search, Truck } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import AssetFormModal from '../components/AssetFormModal';

export default function Equipment() {
  const navigate = useNavigate();
  const { assets, teams, registries, loading, addAsset, updateAsset } = useData();

  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState(null);

  const teamName = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id) => (id ? map.get(id) || '—' : 'Sem equipe');
  }, [teams]);

  const locationName = useMemo(() => {
    const map = new Map(registries.locations.map((l) => [l.id, l.name]));
    return (id) => (id ? map.get(id) || '—' : '—');
  }, [registries.locations]);

  const types = useMemo(
    () => [...new Set(assets.map((a) => a.tipo).filter(Boolean))].sort(),
    [assets]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (teamFilter !== 'all' && (a.team_id || 'none') !== teamFilter) return false;
      if (typeFilter !== 'all' && a.tipo !== typeFilter) return false;
      if (statusFilter !== 'all' && (a.status || 'disponivel') !== statusFilter) return false;
      if (!q) return true;
      return [a.name, a.model, a.plate, a.vin, a.supervisor, a.owner]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [assets, search, teamFilter, typeFilter, statusFilter]);

  return (
    <div>
      <PageHeader title="Equipamentos" subtitle={`${filtered.length} de ${assets.length} equipamentos cadastrados`}>
        <button onClick={() => setForm({})} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Novo equipamento
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, placa, VIN, supervisor…"
            className="input-apple pl-9"
          />
        </div>
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="input-apple w-auto min-w-[140px]">
          <option value="all">Todas as equipes</option>
          <option value="none">Sem equipe</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-apple w-auto min-w-[130px]">
          <option value="all">Todos os tipos</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-apple w-auto min-w-[130px]">
          <option value="all">Todos os status</option>
          <option value="disponivel">Disponível</option>
          <option value="em_uso">Em uso</option>
          <option value="manutencao">Manutenção</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={assets.length === 0 ? 'Nenhum equipamento cadastrado' : 'Nenhum equipamento para esse filtro'}
            hint={assets.length === 0 ? 'Cadastre trucks, trailers, escavadeiras e demais máquinas.' : undefined}
            action={assets.length === 0 && (
              <button onClick={() => setForm({})} className="btn-primary px-4 py-2 text-[13px]">Adicionar equipamento</button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Equipamento</th><th>Tipo</th><th>Modelo</th><th>Ano</th><th>Placa</th>
                  <th>Equipe</th><th>Status</th><th>Local</th><th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/equipamentos/asset/${a.id}`)}>
                    <td className="cell-strong">{a.name}</td>
                    <td>{a.tipo || '—'}</td>
                    <td>{a.model || '—'}</td>
                    <td className="tabular-nums">{a.year || '—'}</td>
                    <td>{a.plate || '—'}</td>
                    <td>{teamName(a.team_id)}</td>
                    <td><StatusBadge status={a.status || 'disponivel'} /></td>
                    <td>{locationName(a.location_id)}</td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setForm({ asset: a }); }}
                          title="Editar"
                          aria-label={`Editar ${a.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AssetFormModal
        open={Boolean(form)}
        asset={form?.asset}
        teams={teams}
        registries={registries}
        onClose={() => setForm(null)}
        onSubmit={(fields) => (form?.asset ? updateAsset(form.asset.id, fields) : addAsset(fields))}
      />
    </div>
  );
}
