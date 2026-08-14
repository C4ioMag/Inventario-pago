import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Package, Pencil, Plus, Trash2, Truck, X } from 'lucide-react';
import { fmtUSD } from '../lib/format';

/**
 * Painel largo da equipe: mostra tudo que está sob responsabilidade dela
 * (veículos/máquinas + itens de estoque), com ações de renomear e excluir.
 */
export default function TeamPanel({
  open, team, assets, items, onClose, onOpenAsset, onAddAsset, onRename, onDelete,
}) {
  const [tab, setTab] = useState('assets');
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const isUnassigned = !team?.id;

  const stockValue = useMemo(
    () => items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0),
    [items]
  );

  const byType = useMemo(() => {
    const map = new Map();
    for (const a of assets) map.set(a.tipo || 'Outro', (map.get(a.tipo || 'Outro') || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [assets]);

  function startRename() {
    setDraftName(team.name);
    setRenaming(true);
  }

  async function commitRename() {
    const name = draftName.trim();
    if (name && name !== team.name) await onRename(team.id, name);
    setRenaming(false);
  }

  return (
    <AnimatePresence>
      {open && team && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="surface relative flex max-h-[88vh] w-full max-w-[880px] flex-col overflow-hidden rounded-[20px]"
            style={{ boxShadow: 'var(--shadow-modal)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b px-7 pb-5 pt-6" style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-0 flex-1">
                <p className="label-caps">{isUnassigned ? 'Pátio' : 'Equipe'}</p>
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
                      className="input-apple max-w-[300px] text-[20px] font-bold"
                    />
                    <button onClick={commitRename} className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full">
                      <Check size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="truncate text-[24px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {team.name}
                    </h2>
                    {!isUnassigned && (
                      <button
                        onClick={startRename}
                        className="btn-ghost flex h-7 w-7 items-center justify-center rounded-full"
                        title="Renomear equipe"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!isUnassigned && (
                  <button
                    onClick={onDelete}
                    className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full"
                    title="Excluir equipe"
                    aria-label="Excluir equipe"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button onClick={onClose} className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full" aria-label="Fechar">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <Stat value={assets.length} label="veículos" />
              <Stat value={items.length} label="itens de estoque" divider />
              <Stat value={fmtUSD(stockValue)} label="valor em estoque" divider small />
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between gap-3 px-7 py-4">
              <div className="flex gap-1 rounded-full p-1" style={{ background: 'var(--bg-secondary)' }}>
                <PanelTab active={tab === 'assets'} onClick={() => setTab('assets')}>
                  Veículos ({assets.length})
                </PanelTab>
                <PanelTab active={tab === 'stock'} onClick={() => setTab('stock')}>
                  Estoque ({items.length})
                </PanelTab>
              </div>
              {tab === 'assets' && (
                <button onClick={onAddAsset} className="btn-primary flex items-center gap-2 px-4 py-2 text-[13px]">
                  <Plus size={14} /> Adicionar
                </button>
              )}
            </div>

            {/* Body */}
            <div className="min-h-[220px] flex-1 overflow-y-auto px-7 pb-7">
              {tab === 'assets' ? (
                assets.length === 0 ? (
                  <Empty icon={<Truck size={26} strokeWidth={1.5} />} text="Nenhum veículo sob esta equipe" />
                ) : (
                  <>
                    {byType.length > 1 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {byType.map(([tipo, n]) => (
                          <span
                            key={tipo}
                            className="rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                          >
                            {tipo} · {n}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="surface row-divide overflow-hidden rounded-[14px]">
                      {assets.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => onOpenAsset(a)}
                          className="row-hover flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{a.name}</p>
                            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                              {[a.tipo, a.model, a.plate].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
                        </button>
                      ))}
                    </div>
                  </>
                )
              ) : items.length === 0 ? (
                <Empty icon={<Package size={26} strokeWidth={1.5} />} text="Nenhum item de estoque nesta equipe" />
              ) : (
                <div className="surface row-divide overflow-hidden rounded-[14px]">
                  {items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{i.name}</p>
                        <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                          {fmtUSD(i.unit_price)} / unidade
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className="text-[17px] font-bold tabular-nums"
                          style={{ color: Number(i.quantity) <= 3 ? 'var(--danger)' : 'var(--text)' }}
                        >
                          {i.quantity}
                        </p>
                        <p className="label-caps">un.</p>
                      </div>
                    </div>
                  ))}
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
    <div className="px-7 py-4" style={divider ? { borderLeft: '1px solid var(--border)' } : undefined}>
      <p
        className={`${small ? 'text-[20px]' : 'text-[26px]'} font-bold leading-none tabular-nums`}
        style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      <p className="label-caps mt-1.5">{label}</p>
    </div>
  );
}

function PanelTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
      style={{
        background: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-secondary)',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--text-tertiary)' }}>
      {icon}
      <p className="mt-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>{text}</p>
    </div>
  );
}
