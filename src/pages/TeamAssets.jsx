import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Truck, Wrench } from 'lucide-react';
import { useData } from '../context/DataContext';
import AssetFormModal from '../components/AssetFormModal';

export default function TeamAssets() {
  const { teamId: rawTeamId } = useParams();
  const teamId = rawTeamId === 'sem-equipe' ? null : rawTeamId;
  const navigate = useNavigate();
  const { teams, assets, loading, addAsset } = useData();
  const [createOpen, setCreateOpen] = useState(false);

  const team = teams.find((t) => t.id === teamId);
  const teamName = teamId ? team?.name : 'Sem equipe';

  const teamAssets = useMemo(
    () => assets.filter((a) => (a.team_id || null) === teamId),
    [assets, teamId]
  );

  if (!loading && teamId && !team) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-secondary)' }}>Equipe não encontrada.</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/equipamentos')}
        className="btn-ghost mb-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
      >
        <ChevronLeft size={15} /> Equipamentos
      </button>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{teamName}</h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {teamAssets.length} veículo{teamAssets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[13px]">
          <Truck size={15} /> Novo veículo
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[60px] rounded-[12px]" />
          ))}
        </div>
      ) : teamAssets.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center rounded-[16px] py-20 text-center">
          <Wrench size={32} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <p className="mt-4 text-[15px] font-medium" style={{ color: 'var(--text)' }}>Nenhum veículo aqui ainda</p>
          <button onClick={() => setCreateOpen(true)} className="btn-primary mt-4 px-5 py-2.5 text-[13px]">
            Adicionar veículo
          </button>
        </div>
      ) : (
        <div className="surface row-divide overflow-hidden rounded-[16px]">
          {teamAssets.map((a, idx) => (
            <motion.button
              key={a.id}
              onClick={() => navigate(`/equipamentos/${rawTeamId}/${a.id}`)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
              className="row-hover flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{a.name}</p>
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {a.tipo}{a.model ? ` · ${a.model}` : ''}{a.plate ? ` · ${a.plate}` : ''}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      <AssetFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(fields) => addAsset(fields)}
        teams={teams}
        defaultTeamId={teamId || ''}
      />
    </div>
  );
}
