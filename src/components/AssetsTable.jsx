import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Search, Truck } from 'lucide-react';

const COLS = 'minmax(120px,1.1fr) minmax(90px,0.8fr) minmax(110px,1fr) 90px 100px minmax(110px,1fr) 44px';

export default function AssetsTable({ assets, teams, onOpen, onEdit }) {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const teamName = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id) => (id ? map.get(id) || '—' : 'Sem equipe');
  }, [teams]);

  const types = useMemo(
    () => [...new Set(assets.map((a) => a.tipo).filter(Boolean))].sort(),
    [assets]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (teamFilter !== 'all') {
        const key = a.team_id || 'none';
        if (key !== teamFilter) return false;
      }
      if (typeFilter !== 'all' && a.tipo !== typeFilter) return false;
      if (!q) return true;
      return [a.name, a.model, a.plate, a.vin, a.supervisor, a.owner]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [assets, search, teamFilter, typeFilter]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, placa, VIN, supervisor…"
            className="input-apple pl-10"
          />
        </div>
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="input-apple w-auto min-w-[150px]">
          <option value="all">Todas as equipes</option>
          <option value="none">Sem equipe</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-apple w-auto min-w-[130px]">
          <option value="all">Todos os tipos</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center rounded-[16px] py-20 text-center">
          <Truck size={30} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <p className="mt-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {assets.length === 0 ? 'Nenhum asset cadastrado ainda' : 'Nenhum resultado para esse filtro'}
          </p>
        </div>
      ) : (
        <div className="surface overflow-hidden rounded-[16px]">
          <div className="hidden overflow-x-auto md:block">
            <div
              className="grid gap-3 border-b px-5 py-3"
              style={{ gridTemplateColumns: COLS, borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              {['Nome', 'Tipo', 'Modelo', 'Ano', 'Placa', 'Equipe', ''].map((h, i) => (
                <span key={i} className="label-caps">{h}</span>
              ))}
            </div>
            <div className="row-divide">
              {filtered.map((a, idx) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.012, 0.25) }}
                  className="row-hover grid cursor-pointer items-center gap-3 px-5 py-3.5"
                  style={{ gridTemplateColumns: COLS }}
                  onClick={() => onOpen(a)}
                >
                  <span className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{a.name}</span>
                  <span className="truncate text-[13px]" style={{ color: 'var(--text-secondary)' }}>{a.tipo || '—'}</span>
                  <span className="truncate text-[13px]" style={{ color: 'var(--text-secondary)' }}>{a.model || '—'}</span>
                  <span className="text-[13px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>{a.year || '—'}</span>
                  <span className="truncate text-[13px]" style={{ color: 'var(--text-secondary)' }}>{a.plate || '—'}</span>
                  <span className="truncate text-[13px]" style={{ color: a.team_id ? 'var(--text)' : 'var(--text-tertiary)' }}>
                    {teamName(a.team_id)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                    className="btn-ghost flex h-8 w-8 items-center justify-center rounded-full"
                    title="Editar"
                    aria-label={`Editar ${a.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <div className="row-divide md:hidden">
            {filtered.map((a) => (
              <div key={a.id} className="row-hover flex items-center justify-between gap-3 px-4 py-3.5" onClick={() => onOpen(a)}>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{a.name}</p>
                  <p className="mt-0.5 truncate text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                    {[a.tipo, a.model, a.plate, teamName(a.team_id)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                  className="btn-ghost flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  aria-label={`Editar ${a.name}`}
                >
                  <Pencil size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>
        {filtered.length} de {assets.length} asset{assets.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
