import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, PackagePlus, PackageSearch, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import ItemCard from '../components/ItemCard';
import AddItemModal from '../components/AddItemModal';
import AdjustStockModal from '../components/AdjustStockModal';
import InvoiceModal from '../components/InvoiceModal';
import { exportInventoryPDF, exportInvoicePDF } from '../lib/pdf';
import { fmtUSD } from '../lib/format';

export default function Dashboard() {
  const { items, teams, loading, dbConnected, addItem, addStock, removeStock, registerInvoice } = useData();
  const { notify } = useToast();

  const [scope, setScope] = useState(null); // null = Geral, otherwise team id
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [adjust, setAdjust] = useState(null); // { mode, item }
  const [removal, setRemoval] = useState(null); // { item, amountRemoved }

  const scopedItems = useMemo(
    () => items.filter((i) => (i.team_id || null) === scope),
    [items, scope]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedItems;
    return scopedItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [scopedItems, search]);

  const totalValue = useMemo(
    () => scopedItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0),
    [scopedItems]
  );

  async function handleAdjustConfirm(amount) {
    if (adjust.mode === 'add') {
      await addStock(adjust.item.id, amount);
      setAdjust(null);
    } else {
      const result = await removeStock(adjust.item.id, amount);
      setAdjust(null);
      if (result) setRemoval(result);
    }
  }

  async function handleCreateInvoice({ item, quantity, machine, vin }) {
    const invoice = await registerInvoice({ item, quantity, machine, vin });
    exportInvoicePDF(invoice);
    notify(`Invoice #${invoice.invoice_number} gerado`, 'success');
  }

  function handleSkipInvoice() {
    setRemoval(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Estoque</h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {scopedItems.length} itens · valor total {fmtUSD(totalValue)}
            {!dbConnected && ' · salvando neste navegador'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => (scopedItems.length ? exportInventoryPDF(scopedItems) : notify('Adicione itens primeiro', 'info'))}
            className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-[13px]"
          >
            <Download size={15} /> Exportar PDF
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[13px]"
          >
            <PackagePlus size={15} /> Novo item
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        <ScopeChip label="Geral" active={scope === null} onClick={() => setScope(null)} />
        {teams.map((t) => (
          <ScopeChip key={t.id} label={t.name} active={scope === t.id} onClick={() => setScope(t.id)} />
        ))}
      </div>

      {scopedItems.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item…"
            className="input-apple pl-10"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-[168px] rounded-[16px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="surface flex flex-col items-center justify-center rounded-[16px] py-20 text-center"
        >
          <PackageSearch size={32} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <p className="mt-4 text-[15px] font-medium" style={{ color: 'var(--text)' }}>
            {scopedItems.length === 0 ? 'Nenhum item aqui ainda' : 'Nenhum item encontrado'}
          </p>
          {scopedItems.length === 0 && (
            <button onClick={() => setAddOpen(true)} className="btn-primary mt-4 px-5 py-2.5 text-[13px]">
              Adicionar primeiro item
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAdd={(it) => setAdjust({ mode: 'add', item: it })}
                onRemove={(it) => setAdjust({ mode: 'remove', item: it })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={({ name, quantity, unitPrice }) => addItem(name, quantity, unitPrice, scope)}
      />

      <AdjustStockModal
        open={Boolean(adjust)}
        mode={adjust?.mode}
        item={adjust?.item}
        onClose={() => setAdjust(null)}
        onConfirm={handleAdjustConfirm}
      />

      <InvoiceModal
        open={Boolean(removal)}
        removal={removal}
        onClose={handleSkipInvoice}
        onCreateInvoice={handleCreateInvoice}
      />
    </div>
  );
}

function ScopeChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
      style={{
        background: active ? 'var(--text)' : 'var(--bg-secondary)',
        color: active ? 'var(--bg)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );
}
