import { useState } from 'react';
import Modal from './Modal';

export default function AddItemModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setQuantity('');
    setUnitPrice('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), quantity: Number(quantity), unitPrice: Number(unitPrice) });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Novo item" subtitle="Adicione um item ao estoque">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Nome do item</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Filtro de óleo"
            className="input-apple"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Quantidade</label>
            <input
              required
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="input-apple"
            />
          </div>
          <div>
            <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Preço/un (USD)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              className="input-apple"
            />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary mt-2 w-full py-3 text-[15px]">
          {saving ? 'Salvando…' : 'Adicionar ao estoque'}
        </button>
      </form>
    </Modal>
  );
}
