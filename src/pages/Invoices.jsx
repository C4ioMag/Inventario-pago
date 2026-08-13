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
        <h1 className="text-[26px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Invoices</h1>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} gerado{invoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[64px] rounded-[12px]" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center rounded-[16px] py-20 text-center">
          <Receipt size={32} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <p className="mt-4 text-[15px] font-medium" style={{ color: 'var(--text)' }}>Nenhum invoice gerado ainda</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Invoices aparecem aqui quando você retira itens do estoque
          </p>
        </div>
      ) : (
        <div className="surface row-divide overflow-hidden rounded-[16px]">
          {invoices.map((inv, idx) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.2) }}
              className="row-hover flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  <span className="tabular-nums" style={{ color: 'var(--text-tertiary)' }}>#{inv.invoice_number}</span>{' '}
                  {inv.item_name}
                </p>
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {inv.machine} · VIN {inv.vin} · {fmtDateTime(inv.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{inv.quantity} un.</p>
                  <p className="text-[15px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>{fmtUSD(inv.total)}</p>
                </div>
                <button
                  onClick={() => exportInvoicePDF(inv)}
                  className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full"
                  aria-label="Baixar PDF"
                  title="Baixar PDF"
                >
                  <Download size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
