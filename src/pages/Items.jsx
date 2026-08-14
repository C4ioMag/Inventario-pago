import { useMemo, useState } from 'react';
import { ArrowLeftRight, Download, Minus, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import StatusBadge, { itemStatus } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import AddItemModal from '../components/AddItemModal';
import AdjustStockModal from '../components/AdjustStockModal';
import InvoiceModal from '../components/InvoiceModal';
import ConfirmDialog from '../components/ConfirmDialog';
import TransferModal from '../components/TransferModal';
import { exportInventoryPDF, exportInvoicePDF } from '../lib/pdf';
import { fmtUSD } from '../lib/format';

export default function Items() {
  const {
    items, teams, loading, dbConnected,
    addItem, updateItemFields, removeItem, addStock, removeStock, transferItem, registerInvoice,
  } = useData();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [removal, setRemoval] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const teamName = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id) => (id ? map.get(id) || '—' : 'Yard');
  }, [teams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (teamFilter !== 'all' && (i.team_id || 'none') !== teamFilter) return false;
      return !q || i.name.toLowerCase().includes(q);
    });
  }, [items, search, teamFilter]);

  const totalValue = useMemo(
    () => filtered.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0),
    [filtered]
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

  return (
    <div>
      <PageHeader
        title="Itens"
        subtitle={`${filtered.length} de ${items.length} itens · ${fmtUSD(totalValue)} em estoque${dbConnected ? '' : ' · salvando neste navegador'}`}
      >
        <button
          onClick={() => (filtered.length ? exportInventoryPDF(filtered) : notify('Adicione itens primeiro', 'info'))}
          className="btn-ghost flex items-center gap-2 px-3.5 py-2 text-[13px]"
        >
          <Download size={15} /> Exportar PDF
        </button>
        <button onClick={() => setForm({})} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Novo item
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar item…" className="input-apple pl-9" />
        </div>
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="input-apple w-auto min-w-[150px]">
          <option value="all">Todas as equipes</option>
          <option value="none">Yard (geral)</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={items.length === 0 ? 'Nenhum item cadastrado' : 'Nenhum item para esse filtro'}
            hint={items.length === 0 ? 'Comece cadastrando o primeiro item do inventário.' : undefined}
            action={items.length === 0 && (
              <button onClick={() => setForm({})} className="btn-primary px-4 py-2 text-[13px]">Adicionar item</button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th><th>Equipe</th>
                  <th className="!text-right">Qtd</th><th className="!text-right">Preço/un</th><th className="!text-right">Total</th>
                  <th>Status</th><th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td className="cell-strong">{i.name}</td>
                    <td>{teamName(i.team_id)}</td>
                    <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{i.quantity}</td>
                    <td className="text-right tabular-nums">{fmtUSD(i.unit_price)}</td>
                    <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>
                      {fmtUSD(Number(i.quantity) * Number(i.unit_price))}
                    </td>
                    <td><StatusBadge status={itemStatus(i)} /></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Retirar" onClick={() => setAdjust({ mode: 'remove', item: i })} disabled={Number(i.quantity) <= 0}>
                          <Minus size={14} />
                        </IconBtn>
                        <IconBtn title="Adicionar" onClick={() => setAdjust({ mode: 'add', item: i })}>
                          <Plus size={14} />
                        </IconBtn>
                        <IconBtn title="Transferir" onClick={() => setTransfer(i)} disabled={Number(i.quantity) <= 0}>
                          <ArrowLeftRight size={13} />
                        </IconBtn>
                        <IconBtn title="Editar" onClick={() => setForm({ item: i })}>
                          <Pencil size={13} />
                        </IconBtn>
                        <IconBtn title="Excluir" onClick={() => setConfirm(i)} danger>
                          <Trash2 size={13} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddItemModal
        open={Boolean(form)}
        item={form?.item}
        teams={teams}
        onClose={() => setForm(null)}
        onSubmit={(fields) => (form?.item
          ? updateItemFields(form.item.id, {
              name: fields.name,
              quantity: fields.quantity,
              unit_price: fields.unitPrice,
              min_quantity: fields.minQuantity,
              team_id: fields.teamId,
            })
          : addItem(fields))}
      />

      <AdjustStockModal
        open={Boolean(adjust)}
        mode={adjust?.mode}
        item={adjust?.item}
        onClose={() => setAdjust(null)}
        onConfirm={handleAdjustConfirm}
      />

      <TransferModal
        open={Boolean(transfer)}
        entity={transfer}
        kind="item"
        teams={teams}
        teamNameOf={(id) => (id ? teamName(id) : null)}
        onClose={() => setTransfer(null)}
        onSubmit={transferItem}
      />

      <InvoiceModal
        open={Boolean(removal)}
        removal={removal}
        onClose={() => setRemoval(null)}
        onCreateInvoice={handleCreateInvoice}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Excluir "${confirm?.name}"?`}
        message="O item sai do inventário. O histórico de movimentações dele continua registrado."
        confirmLabel="Excluir item"
        onConfirm={() => removeItem(confirm.id)}
      />
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors disabled:opacity-30"
      style={{ borderColor: 'var(--border)', color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}
