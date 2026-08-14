import { useEffect, useState } from 'react';
import Modal from './Modal';
import { MAINTENANCE_TYPES, maintenanceType } from '../lib/maintenance';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const BASE = { type: 'oleo', partName: '', quantity: 1, date: today(), odometer: '', cost: '', notes: '', itemId: '' };

export default function MaintenanceModal({ open, onClose, onSubmit, items = [], assetName }) {
  const [form, setForm] = useState(BASE);
  const [details, setDetails] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...BASE, date: today() });
      setDetails({});
    }
  }, [open]);

  const config = maintenanceType(form.type);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setDetail = (key, value) => setDetails((d) => ({ ...d, [key]: value }));
  const selectedItem = items.find((i) => i.id === form.itemId);
  const needsName = config.defaultName === '';

  function changeType(e) {
    setForm((f) => ({ ...f, type: e.target.value, partName: '' }));
    setDetails({});
  }

  function toggleCheckbox(key, option) {
    const current = details[key] || [];
    setDetail(key, current.includes(option) ? current.filter((o) => o !== option) : [...current, option]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        type: form.type,
        itemId: form.itemId || null,
        partName: selectedItem ? selectedItem.name : (form.partName.trim() || config.defaultName || config.label),
        quantity: Number(form.quantity) || 1,
        date: form.date,
        odometer: form.odometer === '' ? null : Number(form.odometer),
        cost: form.cost === '' ? null : Number(form.cost),
        details,
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
      maxWidth={520}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Tipo de manutenção">
          <select value={form.type} onChange={changeType} className="input-apple">
            {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>

        {needsName && (
          <Field label={config.nameLabel || 'Descrição'}>
            <input
              required
              value={form.partName}
              onChange={set('partName')}
              placeholder={config.namePlaceholder}
              className="input-apple"
            />
          </Field>
        )}

        {/* Campos específicos do tipo escolhido */}
        <section className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <p className="label-caps mb-3">{config.label}</p>
          <div className="grid grid-cols-2 gap-3">
            {config.fields.map((f) => (
              <div key={f.key} className={f.type === 'checkboxes' ? 'col-span-2' : undefined}>
                <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {f.label}
                </label>
                {f.type === 'checkboxes' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {f.options.map((o) => {
                      const active = (details[f.key] || []).includes(o);
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => toggleCheckbox(f.key, o)}
                          className="rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors"
                          style={{
                            borderColor: active ? 'var(--accent)' : 'var(--border-strong)',
                            background: active ? 'var(--accent-soft)' : 'transparent',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                ) : f.type === 'select' ? (
                  <select
                    value={details[f.key] || ''}
                    onChange={(e) => setDetail(f.key, e.target.value)}
                    className="input-apple"
                  >
                    <option value="">—</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    step={f.step}
                    value={details[f.key] || ''}
                    onChange={(e) => setDetail(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="input-apple"
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {items.length > 0 && (
          <Field label="Usar peça do estoque (opcional — desconta a quantidade)">
            <select value={form.itemId} onChange={set('itemId')} className="input-apple">
              <option value="">— Não descontar do estoque —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.quantity} disponível)</option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input type="date" required value={form.date} onChange={set('date')} className="input-apple" />
          </Field>
          <Field label={config.requiresOdometer ? 'Odômetro na troca' : 'Odômetro (opcional)'}>
            <input
              type="number" min="0" step="1"
              required={config.requiresOdometer}
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

        {config.requiresOdometer && (
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Ao registrar a troca de óleo, o sistema recalcula sozinho quando será a próxima,
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
