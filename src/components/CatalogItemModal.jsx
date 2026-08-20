import { useEffect, useState } from 'react';
import Modal from './Modal';

const BLANK = { name: '', unit: '', defaultPrice: '', trackStock: true, notes: '' };

/**
 * Item do catálogo: o cadastro do produto em si, separado do estoque.
 * "Controla estoque" desligado é o caso do material comprado na rua — não tem
 * saldo, só o registro de quanto foi entregue a cada equipe.
 */
export default function CatalogItemModal({ open, onClose, onSubmit, product }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(product);

  useEffect(() => {
    if (!open) return;
    setForm(product ? {
      name: product.name || '',
      unit: product.unit || '',
      defaultPrice: product.default_price ?? '',
      trackStock: product.track_stock !== false,
      notes: product.notes || '',
    } : BLANK);
  }, [open, product]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        unit: form.unit.trim() || null,
        defaultPrice: form.defaultPrice === '' ? null : Number(form.defaultPrice),
        trackStock: form.trackStock,
        notes: form.notes.trim() || null,
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
      title={isEdit ? 'Editar item do catálogo' : 'Novo item no catálogo'}
      subtitle={isEdit ? product?.name : 'Fica salvo para você só dizer a quantidade depois'}
      maxWidth={440}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field label="Nome do item">
          <input required autoFocus value={form.name} onChange={set('name')} placeholder="Ex: Cone de sinalização" className="input-apple" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidade (opcional)">
            <input value={form.unit} onChange={set('unit')} placeholder="un, cx, m…" className="input-apple" />
          </Field>
          <Field label="Preço padrão (opcional)">
            <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={set('defaultPrice')} placeholder="—" className="input-apple" />
          </Field>
        </div>

        <div className="rounded-lg border p-3.5" style={{ borderColor: 'var(--border)' }}>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.trackStock}
              onChange={(e) => setForm((f) => ({ ...f, trackStock: e.target.checked }))}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Controla estoque</span>
              <span className="block text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {form.trackStock
                  ? 'Tem saldo: entra, sai e aparece na lista de estoque.'
                  : 'Sem saldo — comprado na rua. Você só registra quanto foi para cada equipe.'}
              </span>
            </span>
          </label>
        </div>

        <Field label="Observação (opcional)">
          <input value={form.notes} onChange={set('notes')} placeholder="Ex: comprar na Home Depot" className="input-apple" />
        </Field>

        <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Salvar no catálogo'}
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
