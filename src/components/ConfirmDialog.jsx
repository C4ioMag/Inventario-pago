import { useState } from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Excluir', danger = true }) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={380}>
      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <div className="mt-5 flex gap-2">
        <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-[14px]">Cancelar</button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="flex-1 rounded-[10px] py-2.5 text-[14px] font-semibold transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{
            background: danger ? 'var(--danger)' : 'var(--btn-bg)',
            color: danger ? '#FFFFFF' : 'var(--btn-fg)',
          }}
        >
          {busy ? 'Excluindo…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
