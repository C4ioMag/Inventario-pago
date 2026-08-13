import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import Modal from './Modal';

export default function AdjustStockModal({ open, mode, item, onClose, onConfirm }) {
  const [amount, setAmount] = useState(1);
  const [saving, setSaving] = useState(false);
  const isRemove = mode === 'remove';
  const max = isRemove ? Number(item?.quantity) || 0 : Infinity;

  useEffect(() => {
    if (open) setAmount(1);
  }, [open]);

  if (!item) return null;

  function clamp(n) {
    return Math.max(1, Math.min(n, max || 1));
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(clamp(amount));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRemove ? 'Retirar itens' : 'Adicionar itens'}
      subtitle={item.name}
    >
      <div className="flex items-center justify-center gap-4 py-4">
        <button
          onClick={() => setAmount((a) => clamp(a - 1))}
          className="btn-ghost flex h-11 w-11 items-center justify-center rounded-full"
        >
          <Minus size={18} />
        </button>
        <input
          type="number"
          value={amount}
          min={1}
          max={isRemove ? max : undefined}
          onChange={(e) => setAmount(Number(e.target.value) || 1)}
          className="input-apple w-24 text-center text-[22px] font-bold"
        />
        <button
          onClick={() => setAmount((a) => clamp(a + 1))}
          className="btn-ghost flex h-11 w-11 items-center justify-center rounded-full"
        >
          <Plus size={18} />
        </button>
      </div>

      {isRemove && (
        <p className="text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          Disponível: {max} unidade{max !== 1 ? 's' : ''}
        </p>
      )}

      <button
        onClick={handleConfirm}
        disabled={saving || (isRemove && max === 0)}
        className="btn-primary mt-5 w-full py-3 text-[15px]"
      >
        {saving ? 'Salvando…' : isRemove ? `Retirar ${clamp(amount)} unidade(s)` : `Adicionar ${amount} unidade(s)`}
      </button>
    </Modal>
  );
}
