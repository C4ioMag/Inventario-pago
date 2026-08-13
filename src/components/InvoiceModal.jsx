import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Receipt } from 'lucide-react';
import Modal from './Modal';
import { fmtUSD } from '../lib/format';

export default function InvoiceModal({ open, removal, onClose, onCreateInvoice }) {
  const [step, setStep] = useState('ask');
  const [machine, setMachine] = useState('');
  const [vin, setVin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('ask');
      setMachine('');
      setVin('');
    }
  }, [open]);

  if (!removal) return null;
  const { item, amountRemoved } = removal;
  const total = Number(item.unit_price) * amountRemoved;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateInvoice({ item, quantity: amountRemoved, machine: machine.trim(), vin: vin.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'ask' ? 'Itens retirados' : 'Dados do invoice'}
      subtitle={step === 'ask' ? undefined : `${item.name} · ${amountRemoved} un.`}
    >
      <AnimatePresence mode="wait">
        {step === 'ask' ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{item.name}</span>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{amountRemoved} un.</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Valor a cobrar</span>
                <span className="text-[16px] font-bold" style={{ color: 'var(--accent)' }}>{fmtUSD(total)}</span>
              </div>
            </div>

            <p className="mt-4 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Deseja gerar um invoice para cobrar esses itens?
            </p>

            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="btn-ghost flex-1 py-3 text-[14px]">
                Não, obrigado
              </button>
              <button onClick={() => setStep('form')} className="btn-primary flex flex-1 items-center justify-center gap-2 py-3 text-[14px]">
                <Receipt size={16} /> Criar invoice
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-3.5"
          >
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Máquina</label>
              <input
                required
                autoFocus
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                placeholder="Ex: Excavator CAT 320"
                className="input-apple"
              />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>VIN Number</label>
              <input
                required
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="Ex: 1HTMMAAL57H542831"
                className="input-apple uppercase"
              />
            </div>

            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                <span>{item.name} × {amountRemoved}</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{fmtUSD(total)}</span>
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-[15px]">
              <FileText size={16} /> {saving ? 'Gerando…' : 'Gerar invoice em PDF'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}
