import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Check, ChevronRight, Package, Pencil, Plus, Trash2, Truck, X } from 'lucide-react';
import { fmtUSD } from '../lib/format';
import StatusBadge, { itemStatus } from './StatusBadge';

/**
 * Painel da equipe: duas visões — Equipamentos e Itens — do que está
 * sob responsabilidade dela, com transferência e ações rápidas.
 */
export default function TeamPanel({
  open, team, assets, items, initialTab = 'assets',
  onClose, onOpenAsset, onAddAsset, onAddItem, onTransferAsset, onTransferItem, onRename, onDelete,
}) {
  const [tab, setTab] = useState(initialTab);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const isYard = !team?.id;

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setRenaming(false);
    }
  }, [open, initialTab]);

  const stockValue = useMemo(
    () => items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0),
    [items]
  );

  const byType = useMemo(() => {
    const map = new Map();
    for (const a of assets) map.set(a.tipo || 'Sem categoria', (map.get(a.tipo || 'Sem categoria') || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [assets]);

  async function commitRename() {
    const name = draftName.trim();
    if (name && name !== team.name) await onRename(team.id, { name });
    setRenaming(false);
  }

  return (
    <AnimatePresence>
      {open && team && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="card relative flex max-h-[88vh] w-full max-w-[900px] flex-col overflow-hidden"
            style={{ boxShadow: 'var(--shadow-modal)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b px-6 pb-4 pt-5" style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-0 flex-1">
                <p className="label-caps">{isYard ? 'Yard · geral' : 'Equipe'}</p>
                {renaming ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenaming(false);
                      }}
                      className="input-apple max-w-[280px] text-[18px] font-bold"
                    />
                    <button onClick={commitRename} className="btn-ghost flex h-8 w-8 items-center justify-center">
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="truncate text-[22px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {team.name}
                    </h2>
                    {!isYard && (
                      <button
                        onClick={() => { setDraftName(team.name); setRenaming(true); }}
                        className="flex h-7 w-7 items-center justify-center rounded-md border"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        title="Renomear equipe"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                )}
                {team.supervisor && (
                  <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                    Supervisor · {team.supervisor}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!isYard && (
                  <button
                    onClick={onDelete}
                    className="btn-ghost flex h-8 w-8 items-center justify-center"
                    title="Excluir equipe"
                    aria-label="Excluir equipe"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={onClose} className="btn-ghost flex h-8 w-8 items-center justify-center" aria-label="Fechar">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <Stat value={assets.length} label="equipamentos" />
              <Stat value={items.length} label="itens" divider />
              <Stat value={fmtUSD(stockValue)} label="valor em estoque" divider small />
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between gap-3 border-b px-6 py-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
                <PanelTab active={tab === 'assets'} onClick={() => setTab('assets')} icon={Truck}>
                  Equipamentos ({assets.length})
                </PanelTab>
                <PanelTab active={tab === 'items'} onClick={() => setTab('items')} icon={Package}>
                  Itens ({items.length})
                </PanelTab>
              </div>
              <button
                onClick={tab === 'assets' ? onAddAsset : onAddItem}
                className="btn-primary flex items-center gap-2 px-3 py-1.5 text-[12.5px]"
              >
                <Plus size={13} /> {tab === 'assets' ? 'Equipamento' : 'Item'}
              </button>
            </div>

            {/* Body */}
            <div className="min-h-[220px] flex-1 overflow-y-auto p-6">
              {tab === 'assets' ? (
                assets.length === 0 ? (
                  <Empty icon={<Truck size={26} strokeWidth={1.5} />} text="Nenhum equipamento nesta equipe" />
                ) : (
                  <>
                    {byType.length > 1 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {byType.map(([tipo, n]) => (
                          <span
                            key={tipo}
                            className="rounded-md px-2.5 py-1 text-[11.5px] font-medium"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                          >
                            {tipo} · {n}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="card overflow-hidden">
                      <table className="tbl">
                        <thead>
                          <tr><th>Equipamento</th><th>Categoria</th><th>Placa</th><th>Status</th><th className="!text-right">Ações</th></tr>
                        </thead>
                        <tbody>
                          {assets.map((a) => (
                            <tr key={a.id} className="cursor-pointer" onClick={() => onOpenAsset(a)}>
                              <td className="cell-strong">{a.name}</td>
                              <td>{a.tipo || '—'}</td>
                              <td>{a.plate || '—'}</td>
                              <td><StatusBadge status={a.status || 'disponivel'} /></td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <RowBtn title="Transferir" onClick={() => onTransferAsset(a)}>
                                    <ArrowLeftRight size={13} />
                                  </RowBtn>
                                  <RowBtn title="Abrir" onClick={() => onOpenAsset(a)}>
                                    <ChevronRight size={14} />
                                  </RowBtn>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              ) : items.length === 0 ? (
                <Empty icon={<Package size={26} strokeWidth={1.5} />} text="Nenhum item nesta equipe" />
              ) : (
                <div className="card overflow-hidden">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Item</th><th className="!text-right">Qtd</th>
                        <th className="!text-right">Valor</th><th>Status</th><th className="!text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id}>
                          <td className="cell-strong">{i.name}</td>
                          <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{i.quantity}</td>
                          <td className="text-right tabular-nums">{fmtUSD(Number(i.quantity) * Number(i.unit_price))}</td>
                          <td><StatusBadge status={itemStatus(i)} /></td>
                          <td>
                            <div className="flex justify-end">
                              <RowBtn title="Transferir" onClick={() => onTransferItem(i)} disabled={Number(i.quantity) <= 0}>
                                <ArrowLeftRight size={13} />
                              </RowBtn>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ value, label, divider, small }) {
  return (
    <div className="px-6 py-3.5" style={divider ? { borderLeft: '1px solid var(--border)' } : undefined}>
      <p
        className={`${small ? 'text-[18px]' : 'text-[24px]'} font-bold leading-none tabular-nums`}
        style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      <p className="label-caps mt-1.5">{label}</p>
    </div>
  );
}

function PanelTab({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
      style={{
        background: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-secondary)',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
      }}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}

function RowBtn({ children, title, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors disabled:opacity-30"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--text-tertiary)' }}>
      {icon}
      <p className="mt-3 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{text}</p>
    </div>
  );
}
