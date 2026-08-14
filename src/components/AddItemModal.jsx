import { useEffect, useState } from 'react';
import Modal from './Modal';

const BLANK = {
  name: '', quantity: '', unit_price: '', min_quantity: '3',
  category_id: '', supplier_id: '', location_id: '', team_id: '', status: 'disponivel',
};

export default function AddItemModal({ open, onClose, onSubmit, item, registries, teams, defaultTeamId }) {
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
        category_id: item.category_id || '',
        supplier_id: item.supplier_id || '',
        location_id: item.location_id || '',
        team_id: item.team_id || '',
        status: item.status || 'disponivel',
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
        categoryId: form.category_id || null,
        supplierId: form.supplier_id || null,
        locationId: form.location_id || null,
        teamId: form.team_id || null,
        status: form.status,
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
      maxWidth={520}
    >
      <form onSubmit={handleSubmit} className="max-h-[68vh] space-y-3.5 overflow-y-auto pr-1">
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select value={form.category_id} onChange={set('category_id')} className="input-apple">
              <option value="">— Nenhuma —</option>
              {registries.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Equipe">
            <select value={form.team_id} onChange={set('team_id')} className="input-apple">
              <option value="">Geral</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Fornecedor">
            <select value={form.supplier_id} onChange={set('supplier_id')} className="input-apple">
              <option value="">— Nenhum —</option>
              {registries.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Local">
            <select value={form.location_id} onChange={set('location_id')} className="input-apple">
              <option value="">— Nenhum —</option>
              {registries.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Status">
          <select value={form.status} onChange={set('status')} className="input-apple">
            <option value="disponivel">Disponível</option>
            <option value="manutencao">Manutenção</option>
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
