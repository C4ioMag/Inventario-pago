import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Pencil, Trash2, Wrench, PackageSearch } from 'lucide-react';
import { useData } from '../context/DataContext';
import AssetFormModal from '../components/AssetFormModal';
import PartHistoryModal from '../components/PartHistoryModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { fmtDate } from '../lib/format';

const FIELDS = [
  ['model', 'Modelo'],
  ['year', 'Ano'],
  ['plate', 'Placa'],
  ['vin', 'VIN Number'],
  ['team_name', 'Equipe'],
  ['supervisor', 'Supervisor'],
  ['owner', 'Proprietário'],
  ['verizon', 'Verizon'],
  ['bouncie', 'Bouncie'],
  ['samsung', 'Samsung'],
  ['e_pass', 'E-ZPass'],
];

export default function AssetDetail() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { teams, assets, items, assetHistory, loading, updateAsset, removeAsset, addAssetHistoryEntry } = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const asset = assets.find((a) => a.id === assetId);
  const team = teams.find((t) => t.id === asset?.team_id);

  const history = useMemo(
    () => assetHistory
      .filter((h) => h.asset_id === assetId)
      .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at)),
    [assetHistory, assetId]
  );

  const availableItems = useMemo(
    () => items.filter((i) => (i.team_id || null) === (asset?.team_id || null) && Number(i.quantity) > 0),
    [items, asset]
  );

  if (loading) return <div className="skeleton h-[300px] rounded-[16px]" />;
  if (!asset) {
    return (
      <div className="py-20 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>Veículo não encontrado.</p>
      </div>
    );
  }

  const values = { ...asset, team_name: team?.name || 'Sem equipe' };

  return (
    <div>
      <button
        onClick={() => navigate('/equipamentos')}
        className="btn-ghost mb-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
      >
        <ChevronLeft size={15} /> Equipamentos
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps">{asset.tipo}</p>
          <h1 className="mt-1 text-[26px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{asset.name}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-[13px]">
            <Pencil size={14} /> Editar
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="btn-ghost flex h-[42px] w-[42px] items-center justify-center"
            title="Excluir veículo"
            aria-label="Excluir veículo"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="surface row-divide mb-8 overflow-hidden rounded-[16px]">
        {FIELDS.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span className="text-[14px] font-medium" style={{ color: values[key] ? 'var(--text)' : 'var(--text-tertiary)' }}>
              {values[key] || '—'}
            </span>
          </div>
        ))}
        {asset.notes && (
          <div className="px-5 py-3.5">
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Observações</span>
            <p className="mt-1 text-[14px]" style={{ color: 'var(--text)' }}>{asset.notes}</p>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>Histórico de peças</h2>
        <button onClick={() => setHistoryOpen(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[13px]">
          <Wrench size={14} /> Registrar troca
        </button>
      </div>

      {history.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center rounded-[16px] py-16 text-center">
          <PackageSearch size={28} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <p className="mt-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Nenhuma troca registrada ainda</p>
        </div>
      ) : (
        <div className="surface row-divide overflow-hidden rounded-[16px]">
          {history.map((h, idx) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{h.part_name}</p>
                {h.notes && <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{h.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-4 text-right">
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>×{h.quantity}</span>
                <span className="label-caps">{fmtDate(h.date)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AssetFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={(fields) => updateAsset(asset.id, fields)}
        asset={asset}
        teams={teams}
      />

      <PartHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSubmit={(entry) => addAssetHistoryEntry({ assetId: asset.id, ...entry })}
        items={availableItems}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Excluir "${asset.name}"?`}
        message="O veículo e todo o histórico de peças dele serão apagados. Essa ação não pode ser desfeita."
        confirmLabel="Excluir veículo"
        onConfirm={async () => {
          await removeAsset(asset.id);
          navigate('/equipamentos');
        }}
      />
    </div>
  );
}
