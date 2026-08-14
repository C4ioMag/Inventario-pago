import { useEffect, useState } from 'react';
import Modal from './Modal';

const BLANK = { name: '', quantity: '', unit_price: '', min_quantity: '3', team_id: '' };

export default function AddItemModal({ open, onClose, onSubmit, item, teams, defaultTeamId }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(item);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name ?? '',
        quantity: String(item.quantity ?? ''),
        unit_price: String(item.unit_price ?? ''),
        min_quantity: String(item.min_quantity ?? 0),
        team_id: item.team_id || '',
      });
    } else {
      setForm({ ...BLANK, team_id: defaultTeamId || '' });
    }
  }, [open, item, defaultTeamId]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        quantity: Number(form.quantity) || 0,
        unitPrice: Number(form.unit_price) || 0,
        minQuantity: Number(form.min_quantity) || 0,
        teamId: form.team_id || null,
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
      title={isEdit ? 'Editar item' : 'Novo item'}
      subtitle={isEdit ? item?.name : 'Adicione um item ao inventário'}
      maxWidth={440}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field label="Nome do item">
          <input required autoFocus value={form.name} onChange={set('name')} placeholder="Ex: Cone de Sinalização" className="input-apple" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Quantidade">
            <input required type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} placeholder="0" className="input-apple" />
          </Field>
          <Field label="Preço/un (USD)">
            <input required type="number" min="0" step="0.01" value={form.unit_price} onChange={set('unit_price')} placeholder="0.00" className="input-apple" />
          </Field>
          <Field label="Estoque mín.">
            <input type="number" min="0" step="1" value={form.min_quantity} onChange={set('min_quantity')} placeholder="0" className="input-apple" />
          </Field>
        </div>

        <Field label="Equipe">
          <select value={form.team_id} onChange={set('team_id')} className="input-apple">
            <option value="">Yard (geral)</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Adicionar ao inventário'}
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
