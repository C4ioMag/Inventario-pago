import { useEffect, useState } from 'react';
import Modal from './Modal';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PartHistoryModal({ open, onClose, onSubmit, items }) {
  const [itemId, setItemId] = useState('');
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setItemId('');
      setPartName('');
      setQuantity(1);
      setDate(today());
      setNotes('');
    }
  }, [open]);

  const selectedItem = items.find((i) => i.id === itemId);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        itemId: itemId || null,
        partName: selectedItem ? selectedItem.name : partName.trim(),
        quantity: Number(quantity) || 1,
        date,
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar troca de peça" subtitle="Fica salvo no histórico do veículo">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="label-caps mb-2 ml-0.5 block">Peça do estoque (opcional)</label>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="input-apple">
            <option value="">— Digitar manualmente —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.quantity} disponível)</option>
            ))}
          </select>
        </div>

        {!itemId && (
          <div>
            <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Nome da peça</label>
            <input required value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="Ex: Filtro de óleo" className="input-apple" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Quantidade</label>
            <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input-apple" />
          </div>
          <div>
            <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Data</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input-apple" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Observação (opcional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: troca preventiva" className="input-apple" />
        </div>

        <button type="submit" disabled={saving} className="btn-primary mt-2 w-full py-3 text-[15px]">
          {saving ? 'Salvando…' : 'Registrar no histórico'}
        </button>
      </form>
    </Modal>
  );
}
