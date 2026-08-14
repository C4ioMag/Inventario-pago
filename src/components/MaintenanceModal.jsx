import { useEffect, useState } from 'react';
import Modal from './Modal';
import { MAINTENANCE_TYPES } from '../lib/maintenance';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const BLANK_MAINTENANCE = {
  type: 'oleo', partName: '', quantity: 1, date: today(), odometer: '', cost: '', notes: '', itemId: '',
};

export default function MaintenanceModal({ open, onClose, onSubmit, items = [], assetName }) {
  const [form, setForm] = useState(BLANK_MAINTENANCE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...BLANK_MAINTENANCE, date: today() });
  }, [open]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const selectedItem = items.find((i) => i.id === form.itemId);
  const isOil = form.type === 'oleo';

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        type: form.type,
        itemId: form.itemId || null,
        partName: selectedItem ? selectedItem.name : form.partName.trim() || MAINTENANCE_TYPES[form.type].label,
        quantity: Number(form.quantity) || 1,
        date: form.date,
        odometer: form.odometer === '' ? null : Number(form.odometer),
        cost: form.cost === '' ? null : Number(form.cost),
        notes: form.notes.trim(),
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
      title="Registrar manutenção"
      subtitle={assetName ? `${assetName} · fica salvo no histórico` : 'Fica salvo no histórico do equipamento'}
      maxWidth={460}
    >
      <form onSubmit={handleSubmit} className="max-h-[68vh] space-y-3.5 overflow-y-auto pr-1">
        <Field label="Tipo de manutenção">
          <select value={form.type} onChange={set('type')} className="input-apple">
            {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>

        {items.length > 0 && (
          <Field label="Usar peça do estoque (opcional)">
            <select value={form.itemId} onChange={set('itemId')} className="input-apple">
              <option value="">— Não descontar do estoque —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.quantity} disponível)</option>
              ))}
            </select>
          </Field>
        )}

        {!form.itemId && (
          <Field label={isOil ? 'Descrição (opcional)' : 'Peça / serviço'}>
            <input
              required={!isOil}
              value={form.partName}
              onChange={set('partName')}
              placeholder={isOil ? 'Ex: Óleo 15W40 + filtro' : 'Ex: Filtro de ar'}
              className="input-apple"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input type="date" required value={form.date} onChange={set('date')} className="input-apple" />
          </Field>
          <Field label={isOil ? 'Odômetro na troca' : 'Odômetro (opcional)'}>
            <input
              type="number" min="0" step="1"
              required={isOil}
              value={form.odometer}
              onChange={set('odometer')}
              placeholder="Ex: 84200"
              className="input-apple"
            />
          </Field>
          <Field label="Quantidade">
            <input type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} className="input-apple" />
          </Field>
          <Field label="Custo (opcional)">
            <input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} placeholder="0.00" className="input-apple" />
          </Field>
        </div>

        <Field label="Observação (opcional)">
          <input value={form.notes} onChange={set('notes')} placeholder="Ex: troca preventiva" className="input-apple" />
        </Field>

        {isOil && (
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Ao registrar uma troca de óleo, o sistema recalcula sozinho quando será a próxima,
            usando o intervalo configurado no equipamento.
          </p>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : 'Registrar no histórico'}
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
