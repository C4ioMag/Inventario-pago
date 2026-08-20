import { useMemo, useState } from 'react';
import {
  ArrowLeftRight, BookMarked, Download, Minus, Package, Pencil, Plus, Search, Send, Trash2, Truck,
} from 'lucide-react';
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
import TeamOptions from '../components/TeamOptions';
import CatalogItemModal from '../components/CatalogItemModal';
import DeliveryModal from '../components/DeliveryModal';
import { fmtDateTime } from '../lib/format';

export default function Items() {
  const {
    items, teams, catalog, movements, loading, dbConnected,
    addItem, updateItemFields, removeItem, addStock, removeStock, transferItem, registerInvoice,
    addCatalogItem, updateCatalogItem, removeCatalogItem, ensureCatalogItem, deliverCatalogItem,
    requestReview,
  } = useData();
  const { notify } = useToast();

  const [view, setView] = useState('estoque');   // 'estoque' | 'catalogo' | 'entregas'
  const [search, setSearch] = useState('');
  const [catalogForm, setCatalogForm] = useState(null);   // { product? }
  const [delivery, setDelivery] = useState(null);         // { product }
  const [confirmCatalog, setConfirmCatalog] = useState(null);
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

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [catalog, search]);

  /** Entregas diretas ficam na trilha de movimentações, sem virar saldo. */
  const deliveries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements
      .filter((m) => m.kind === 'entrega')
      .filter((m) => (teamFilter === 'all' ? true : (m.team_id || 'none') === teamFilter))
      .filter((m) => !q || [m.entity_name, m.notes].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [movements, teamFilter, search]);

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
        subtitle={view === 'catalogo'
          ? `${catalog.length} item(ns) salvos — reutilize sem digitar tudo de novo`
          : view === 'entregas'
            ? `${deliveries.length} entrega(s) registrada(s) direto para as equipes`
            : `${filtered.length} de ${items.length} itens · ${fmtUSD(totalValue)} em estoque${dbConnected ? '' : ' · salvando neste navegador'}`}
      >
        {view === 'estoque' && (
          <button
            onClick={() => (filtered.length ? exportInventoryPDF(filtered) : notify('Adicione itens primeiro', 'info'))}
            className="btn-ghost flex items-center gap-2 px-3.5 py-2 text-[13px]"
          >
            <Download size={15} /> Exportar PDF
          </button>
        )}
        {view === 'catalogo' ? (
          <button onClick={() => setCatalogForm({})} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
            <Plus size={15} /> Novo item no catálogo
          </button>
        ) : (
          <button onClick={() => setForm({})} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
            <Plus size={15} /> Novo item
          </button>
        )}
      </PageHeader>

      <div className="mb-4 flex w-fit gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
        {[
          ['estoque', 'Estoque', Package],
          ['catalogo', 'Catálogo', BookMarked],
          ['entregas', 'Entregas', Truck],
        ].map(([value, label, Icon]) => (
          <button
            key={value}
            onClick={() => setView(value)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
            style={{
              background: view === value ? 'var(--bg-elevated)' : 'transparent',
              color: view === value ? 'var(--text)' : 'var(--text-secondary)',
              boxShadow: view === value ? 'var(--shadow-xs)' : 'none',
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar item…" className="input-apple pl-9" />
        </div>
        {view !== 'catalogo' && (
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="input-apple w-auto min-w-[150px]">
            <option value="all">Todas as equipes</option>
            <option value="none">Yard (geral)</option>
            <TeamOptions teams={teams} />
          </select>
        )}
      </div>

      {view === 'estoque' && (
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
      )}

      {view === 'catalogo' && (
        <div className="card overflow-hidden">
          {filteredCatalog.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title={catalog.length === 0 ? 'Catálogo vazio' : 'Nenhum item com esse nome'}
              hint="Salve os itens que você usa sempre (cones, fita, luvas). Depois é só dizer a quantidade — com ou sem estoque."
              action={catalog.length === 0 && (
                <button onClick={() => setCatalogForm({})} className="btn-primary px-4 py-2 text-[13px]">
                  Salvar primeiro item
                </button>
              )}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Item</th><th>Unidade</th><th className="!text-right">Preço padrão</th>
                    <th>Estoque</th><th>Observação</th><th className="!text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-strong">{c.name}</td>
                      <td>{c.unit || '—'}</td>
                      <td className="text-right tabular-nums">{c.default_price != null ? fmtUSD(c.default_price) : '—'}</td>
                      <td>
                        <span
                          className="badge"
                          style={c.track_stock !== false
                            ? { background: 'var(--ok-soft)', color: 'var(--ok)' }
                            : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                        >
                          {c.track_stock !== false ? 'Controla saldo' : 'Compra na rua'}
                        </span>
                      </td>
                      <td>{c.notes || '—'}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDelivery({ product: c })}
                            className="btn-ghost flex items-center gap-1.5 px-2.5 py-1 text-[12px]"
                          >
                            <Send size={12} /> Entregar
                          </button>
                          {c.track_stock !== false && (
                            <IconBtn
                              title="Adicionar ao estoque de uma equipe"
                              onClick={() => setForm({ preset: { name: c.name, unitPrice: c.default_price ?? '' } })}
                            >
                              <Plus size={13} />
                            </IconBtn>
                          )}
                          <IconBtn title="Editar" onClick={() => setCatalogForm({ product: c })}>
                            <Pencil size={13} />
                          </IconBtn>
                          <IconBtn title="Excluir do catálogo" danger onClick={() => setConfirmCatalog(c)}>
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
      )}

      {view === 'entregas' && (
        <div className="card overflow-hidden">
          {deliveries.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhuma entrega registrada"
              hint="Use “Entregar” no catálogo para registrar o material que foi comprado e já seguiu para a equipe."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Data</th><th>Item</th><th className="!text-right">Qtd</th>
                    <th>Equipe</th><th>Observação</th><th>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap tabular-nums">{fmtDateTime(m.created_at)}</td>
                      <td className="cell-strong">{m.entity_name}</td>
                      <td className="text-right tabular-nums">{m.quantity ?? '—'}</td>
                      <td>{m.team_name || 'Yard'}</td>
                      <td>{m.notes || '—'}</td>
                      <td>{m.user_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CatalogItemModal
        open={Boolean(catalogForm)}
        product={catalogForm?.product}
        onClose={() => setCatalogForm(null)}
        onSubmit={(fields) => (catalogForm?.product
          ? updateCatalogItem(catalogForm.product.id, {
              name: fields.name,
              unit: fields.unit,
              default_price: fields.defaultPrice,
              track_stock: fields.trackStock,
              notes: fields.notes,
            })
          : addCatalogItem(fields))}
      />

      <DeliveryModal
        open={Boolean(delivery)}
        product={delivery?.product}
        teams={teams}
        onClose={() => setDelivery(null)}
        onSubmit={deliverCatalogItem}
      />

      <ConfirmDialog
        open={Boolean(confirmCatalog)}
        onClose={() => setConfirmCatalog(null)}
        title={`Remover "${confirmCatalog?.name}" do catálogo?`}
        message="O estoque e as entregas já registradas continuam como estão."
        confirmLabel="Remover do catálogo"
        onConfirm={() => removeCatalogItem(confirmCatalog.id)}
      />

      <AddItemModal
        open={Boolean(form)}
        item={form?.item}
        preset={form?.preset}
        teams={teams}
        catalog={catalog}
        onClose={() => setForm(null)}
        onSubmit={(fields) => (form?.item
          ? updateItemFields(form.item.id, {
              name: fields.name,
              quantity: fields.quantity,
              unit_price: fields.unitPrice,
              min_quantity: fields.minQuantity,
              team_id: fields.teamId,
            })
          : addItem(fields).then(async (row) => {
              // o item criado fica salvo no catálogo para a próxima vez
              await ensureCatalogItem(fields.name, { defaultPrice: fields.unitPrice || null });
              return row;
            }))}
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
        onReview={requestReview}
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
