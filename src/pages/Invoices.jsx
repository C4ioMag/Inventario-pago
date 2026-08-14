import { Download, Receipt } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { exportInvoicePDF } from '../lib/pdf';
import { fmtDateTime, fmtUSD } from '../lib/format';

export default function Invoices() {
  const { invoices, loading } = useData();
  const total = invoices.reduce((s, i) => s + Number(i.total), 0);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoice(s) gerado(s) · ${fmtUSD(total)} faturado`}
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-11" />)}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhum invoice gerado ainda"
            hint="Invoices aparecem aqui quando você retira itens do estoque e escolhe cobrar."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th><th>Item</th><th>Máquina</th><th>VIN</th>
                  <th className="!text-right">Qtd</th><th className="!text-right">Total</th>
                  <th>Data</th><th className="!text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="tabular-nums">{inv.invoice_number}</td>
                    <td className="cell-strong">{inv.item_name}</td>
                    <td>{inv.machine}</td>
                    <td className="tabular-nums">{inv.vin}</td>
                    <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{inv.quantity}</td>
                    <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{fmtUSD(inv.total)}</td>
                    <td className="whitespace-nowrap tabular-nums">{fmtDateTime(inv.created_at)}</td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          onClick={() => exportInvoicePDF(inv)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                          aria-label={`Baixar invoice ${inv.invoice_number}`}
                          title="Baixar PDF"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
