import { useEffect, useState } from 'react';
import Modal from './Modal';
import TeamOptions from './TeamOptions';

const BLANK = { name: '', quantity: '', unit_price: '', min_quantity: '3', team_id: '' };

export default function AddItemModal({ open, onClose, onSubmit, item, teams, defaultTeamId, catalog = [], preset }) {
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
      setForm({
        ...BLANK,
        name: preset?.name || '',
        unit_price: preset?.unitPrice != null ? String(preset.unitPrice) : '',
        team_id: defaultTeamId || '',
      });
    }
  }, [open, item, defaultTeamId, preset]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const known = catalog.find((c) => c.name.trim().toLowerCase() === form.name.trim().toLowerCase());

  /** Escolher um item do catálogo já traz o preço padrão dele. */
  function handleName(e) {
    const value = e.target.value;
    const match = catalog.find((c) => c.name.trim().toLowerCase() === value.trim().toLowerCase());
    setForm((f) => ({
      ...f,
      name: value,
      unit_price: match?.default_price != null && !f.unit_price ? String(match.default_price) : f.unit_price,
    }));
  }

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
          <input
            required
            autoFocus
            list="catalog-items"
            value={form.name}
            onChange={handleName}
            placeholder="Ex: Cone de Sinalização"
            className="input-apple"
            autoComplete="off"
          />
          {/* itens já salvos aparecem como sugestão — escolher um traz o preço junto */}
          <datalist id="catalog-items">
            {catalog.map((c) => (
              <option key={c.id} value={c.name}>
                {[c.unit, c.track_stock === false ? 'compra na rua' : null].filter(Boolean).join(' · ')}
              </option>
            ))}
          </datalist>
          {!isEdit && catalog.length > 0 && (
            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              {known
                ? `"${known.name}" já está no catálogo.`
                : 'Itens novos entram no catálogo automaticamente.'}
            </p>
          )}
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Quantidade">
            <input required type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} placeholder="0" className="input-apple" />
          </Field>
          <Field label="Preço/un (opcional)">
            <input type="number" min="0" step="0.01" value={form.unit_price} onChange={set('unit_price')} placeholder="—" className="input-apple" />
          </Field>
          <Field label="Estoque mín.">
            <input type="number" min="0" step="1" value={form.min_quantity} onChange={set('min_quantity')} placeholder="0" className="input-apple" />
          </Field>
        </div>

        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Preencha o preço só nos itens que são cobrados — ele é usado no invoice.
        </p>

        <Field label="Equipe">
          <select value={form.team_id} onChange={set('team_id')} className="input-apple">
            <option value="">Yard (geral)</option>
            <TeamOptions teams={teams} />
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
