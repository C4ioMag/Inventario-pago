import { motion } from 'framer-motion';
import { Download, Receipt } from 'lucide-react';
import { useData } from '../context/DataContext';
import { exportInvoicePDF } from '../lib/pdf';
import { fmtDateTime, fmtUSD } from '../lib/format';

export default function Invoices() {
  const { invoices, loading } = useData();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Invoices</h1>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} gerado{invoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[76px] rounded-[18px]" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center rounded-[24px] py-20 text-center">
          <Receipt size={40} style={{ color: 'var(--text-tertiary)' }} />
          <p className="mt-4 text-[15px] font-medium" style={{ color: 'var(--text)' }}>Nenhum invoice gerado ainda</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Invoices aparecem aqui quando você retira itens do estoque
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv, idx) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
              className="surface flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: 'var(--accent-soft)' }}>
                  <Receipt size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                    #{inv.invoice_number} · {inv.item_name}
                  </p>
                  <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                    {inv.machine} · VIN {inv.vin} · {fmtDateTime(inv.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{inv.quantity} un.</p>
                  <p className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>{fmtUSD(inv.total)}</p>
                </div>
                <button
                  onClick={() => exportInvoicePDF(inv)}
                  className="btn-ghost flex h-10 w-10 items-center justify-center rounded-full"
                  aria-label="Baixar PDF"
                  title="Baixar PDF"
                >
                  <Download size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
