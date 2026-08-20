import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Modal from './Modal';
import TeamOptions from './TeamOptions';
import { teamLabel } from '../lib/teams';

/**
 * Envia um equipamento ou item para revisão.
 * A transferência só acontece quando alguém confirmar que o destino recebeu —
 * até lá o registro continua com quem enviou.
 */
export default function ReviewRequestModal({
  open, onClose, onSubmit, assets = [], items = [], teams = [], defaultEntity = null,
}) {
  const [entityType, setEntityType] = useState('asset');
  const [entityId, setEntityId] = useState('');
  const [toTeamId, setToTeamId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEntityType(defaultEntity?.type || 'asset');
    setEntityId(defaultEntity?.id || '');
    setToTeamId('');
    setQuantity(1);
    setNotes('');
  }, [open, defaultEntity]);

  const list = entityType === 'item' ? items : assets;
  const selected = useMemo(() => list.find((e) => e.id === entityId), [list, entityId]);
  const teamOf = (id) => teamLabel(teams.find((t) => t.id === id)) || 'Yard';
  const sameTeam = selected && (selected.team_id || null) === (toTeamId || null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected || sameTeam) return;
    setSaving(true);
    try {
      await onSubmit({
        entityType,
        entityId,
        quantity: entityType === 'item' ? Number(quantity) || 1 : null,
        toTeamId: toTeamId || null,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar para revisão"
      subtitle="Fica pendente até alguém confirmar que o destino recebeu"
      maxWidth={460}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
          {[['asset', 'Equipamento'], ['item', 'Item de estoque']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setEntityType(value); setEntityId(''); }}
              className="flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
              style={{
                background: entityType === value ? 'var(--bg-elevated)' : 'transparent',
                color: entityType === value ? 'var(--text)' : 'var(--text-secondary)',
                boxShadow: entityType === value ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <Field label={entityType === 'item' ? 'Item' : 'Equipamento'}>
          <select required value={entityId} onChange={(e) => setEntityId(e.target.value)} className="input-apple">
            <option value="">— Escolha —</option>
            {list.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.plate ? ` · ${e.plate}` : ''} — {teamOf(e.team_id)}
              </option>
            ))}
          </select>
        </Field>

        {selected && (
          <div className="flex items-center gap-3 rounded-lg p-3.5" style={{ background: 'var(--bg-secondary)' }}>
            <div className="min-w-0 flex-1">
              <p className="label-caps">Sai de</p>
              <p className="mt-1 truncate text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
                {teamOf(selected.team_id)}
              </p>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
            <div className="min-w-0 flex-1 text-right">
              <p className="label-caps">Deve chegar em</p>
              <p className="mt-1 truncate text-[13.5px] font-semibold" style={{ color: 'var(--accent)' }}>
                {toTeamId ? teamOf(toTeamId) : 'Yard'}
              </p>
            </div>
          </div>
        )}

        <Field label="Destino">
          <select value={toTeamId} onChange={(e) => setToTeamId(e.target.value)} className="input-apple">
            <option value="">Yard (geral)</option>
            <TeamOptions teams={teams} disabledId={selected?.team_id || undefined} />
          </select>
        </Field>

        {entityType === 'item' && selected && (
          <Field label={`Quantidade (disponível: ${selected.quantity})`}>
            <input
              type="number"
              min="1"
              max={selected.quantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-apple"
            />
          </Field>
        )}

        <Field label="Observação (opcional)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: levado pelo Leandro na sexta"
            className="input-apple"
          />
        </Field>

        {sameTeam && (
          <p className="text-[12.5px]" style={{ color: 'var(--warn)' }}>
            Origem e destino são a mesma equipe.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !selected || sameTeam}
          className="btn-primary w-full py-2.5 text-[14px] disabled:opacity-50"
        >
          {saving ? 'Enviando…' : 'Enviar para revisão'}
        </button>
      </form>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}
