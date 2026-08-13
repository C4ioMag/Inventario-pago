import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { fmtUSD } from '../lib/format';

export default function ItemCard({ item, onAdd, onRemove }) {
  const total = Number(item.quantity) * Number(item.unit_price);
  const low = Number(item.quantity) <= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="surface flex flex-col justify-between rounded-[20px] p-5"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[16px] font-semibold leading-snug" style={{ color: 'var(--text)' }}>{item.name}</h3>
          <span
            className="chip shrink-0"
            style={{
              background: low ? 'var(--danger-soft)' : 'var(--success-soft)',
              color: low ? 'var(--danger)' : 'var(--success)',
            }}
          >
            {item.quantity} un.
          </span>
        </div>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {fmtUSD(item.unit_price)} / unidade
        </p>
        <p className="mt-0.5 text-[13px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
          Valor em estoque: {fmtUSD(total)}
        </p>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => onRemove(item)}
          disabled={item.quantity <= 0}
          className="btn-ghost flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] disabled:opacity-40"
        >
          <Minus size={15} /> Retirar
        </button>
        <button
          onClick={() => onAdd(item)}
          className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px]"
        >
          <Plus size={15} /> Adicionar
        </button>
      </div>
    </motion.div>
  );
}
