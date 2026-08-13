import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, UsersRound, Warehouse } from 'lucide-react';
import { useData } from '../context/DataContext';
import CreateTeamModal from '../components/CreateTeamModal';

export default function Teams() {
  const { teams, assets, loading, addTeam } = useData();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const counts = useMemo(() => {
    const map = new Map();
    for (const a of assets) {
      const key = a.team_id || '__none__';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [assets]);

  const unassignedCount = counts.get('__none__') || 0;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Equipamentos</h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {teams.length} equipe{teams.length !== 1 ? 's' : ''} · {assets.length} veículo{assets.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[13px]">
          <UsersRound size={15} /> Nova equipe
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[92px] rounded-[16px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TeamTile
            label="Sem equipe"
            sub="Equipamento não atribuído"
            count={unassignedCount}
            onClick={() => navigate('/equipamentos/sem-equipe')}
            icon={<Warehouse size={17} />}
          />
          {teams.map((t, idx) => (
            <TeamTile
              key={t.id}
              label={t.name}
              sub="Equipe"
              count={counts.get(t.id) || 0}
              onClick={() => navigate(`/equipamentos/${t.id}`)}
              delay={idx * 0.03}
            />
          ))}
        </div>
      )}

      <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={addTeam} />
    </div>
  );
}

function TeamTile({ label, sub, count, onClick, icon, delay = 0 }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="row-hover surface flex items-center justify-between rounded-[16px] p-5 text-left"
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
        <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[22px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>{count}</p>
          <p className="label-caps mt-1">veículos</p>
        </div>
        {icon || <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />}
      </div>
    </motion.button>
  );
}
