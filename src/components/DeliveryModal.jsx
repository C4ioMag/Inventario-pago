import { useEffect, useState } from 'react';
import Modal from './Modal';
import TeamOptions from './TeamOptions';
import { fmtUSD } from '../lib/format';

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Entrega direta de um item do catálogo para uma equipe.
 * Não mexe em saldo — serve para o material que é comprado e já vai para a rua.
 */
export default function DeliveryModal({ open, onClose, onSubmit, product, teams = [] }) {
  const [quantity, setQuantity] = useState('');
  const [teamId, setTeamId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuantity('');
    setTeamId('');
    setUnitPrice(product?.default_price ?? '');
    setDate(today());
    setNotes('');
  }, [open, product]);

  const total = Number(quantity) * Number(unitPrice || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        catalogId: product?.id || null,
        name: product?.name,
        teamId: teamId || null,
        quantity: Number(quantity) || 0,
        unitPrice: unitPrice === '' ? null : Number(unitPrice),
        date,
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
      title="Registrar entrega"
      subtitle={product ? `${product.name} — quanto foi para a equipe` : ''}
      maxWidth={440}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Quantidade${product?.unit ? ` (${product.unit})` : ''}`}>
            <input
              required autoFocus type="number" min="1" step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 20"
              className="input-apple"
            />
          </Field>
          <Field label="Preço/un (opcional)">
            <input
              type="number" min="0" step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="—"
              className="input-apple"
            />
          </Field>
        </div>

        <Field label="Para qual equipe">
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="input-apple">
            <option value="">Yard (geral)</option>
            <TeamOptions teams={teams} />
          </select>
        </Field>

        <Field label="Data">
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input-apple" />
        </Field>

        <Field label="Observação (opcional)">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: comprado na Home Depot" className="input-apple" />
        </Field>

        {total > 0 && (
          <p className="rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: 'var(--bg-secondary)', color: 'var(--text)' }}>
            Total da entrega: <strong>{fmtUSD(total)}</strong>
          </p>
        )}

        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          A entrega fica registrada no histórico da equipe. Itens sem controle de estoque não têm saldo.
        </p>

        <button type="submit" disabled={saving || !quantity} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : 'Registrar entrega'}
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
