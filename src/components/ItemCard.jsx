import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { fmtUSD } from '../lib/format';

export default function ItemCard({ item, onAdd, onRemove }) {
  const total = Number(item.quantity) * Number(item.unit_price);
  const low = Number(item.quantity) <= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="surface flex flex-col justify-between rounded-[16px] p-5"
    >
      <div>
        <h3 className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--text)' }}>{item.name}</h3>

        <div className="mt-3.5 flex items-baseline gap-1.5">
          <span
            className="text-[34px] font-bold leading-none tabular-nums"
            style={{ color: low ? 'var(--danger)' : 'var(--text)', letterSpacing: '-0.02em' }}
          >
            {item.quantity}
          </span>
          <span className="label-caps">un. em estoque</span>
        </div>

        <p className="mt-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {fmtUSD(item.unit_price)} / unidade · {fmtUSD(total)} total
        </p>
      </div>

      <div className="mt-5 flex gap-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => onRemove(item)}
          disabled={item.quantity <= 0}
          className="btn-ghost flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] disabled:opacity-30"
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
