import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Modal from './Modal';
import { teamLabel } from '../lib/teams';

/**
 * Transferência entre equipes/yard.
 * Item: move uma quantidade. Equipamento: move o registro inteiro.
 */
export default function TransferModal({ open, onClose, onSubmit, entity, kind, teams, teamNameOf }) {
  const [toTeamId, setToTeamId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isItem = kind === 'item';
  const max = isItem ? Number(entity?.quantity) || 0 : 1;
  const currentTeamId = entity?.team_id || '';

  useEffect(() => {
    if (!open) return;
    setQuantity(isItem ? Math.min(1, max) || 1 : 1);
    setNotes('');
    const firstOther = ['', ...teams.map((t) => t.id)].find((id) => id !== currentTeamId);
    setToTeamId(firstOther ?? '');
  }, [open, isItem, max, teams, currentTeamId]);

  if (!entity) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(isItem
        ? { itemId: entity.id, quantity: Number(quantity), toTeamId: toTeamId || null, notes }
        : { assetId: entity.id, toTeamId: toTeamId || null, notes });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Transferir" subtitle={entity.name} maxWidth={420}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg p-3.5" style={{ background: 'var(--bg-secondary)' }}>
          <div className="min-w-0 flex-1">
            <p className="label-caps">De</p>
            <p className="mt-1 truncate text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
              {teamNameOf(entity.team_id) || 'Yard'}
            </p>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
          <div className="min-w-0 flex-1 text-right">
            <p className="label-caps">Para</p>
            <p className="mt-1 truncate text-[13.5px] font-semibold" style={{ color: 'var(--accent)' }}>
              {toTeamId ? teamNameOf(toTeamId) : 'Yard'}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Destino</label>
          <select value={toTeamId} onChange={(e) => setToTeamId(e.target.value)} className="input-apple">
            <option value="" disabled={currentTeamId === ''}>Yard (geral)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === currentTeamId}>{teamLabel(t)}</option>
            ))}
          </select>
        </div>

        {isItem && (
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Quantidade (disponível: {max})
            </label>
            <input
              type="number"
              min="1"
              max={max}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-apple"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Motivo / observação (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex: veio para o Yard Apopka pois estava quebrada"
            className="input-apple resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || (isItem && (Number(quantity) < 1 || Number(quantity) > max))}
          className="btn-primary w-full py-2.5 text-[14px]"
        >
          {saving ? 'Transferindo…' : 'Confirmar transferência'}
        </button>
      </form>
    </Modal>
  );
}
