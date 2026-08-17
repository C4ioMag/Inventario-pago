import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, DollarSign, ExternalLink, Pencil, Plus,
  RotateCcw, Search, Trash2, Wrench,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import WorkOrderModal from '../components/WorkOrderModal';
import { fmtDate, fmtUSD } from '../lib/format';
import { fmtNum, isOpenWork, maintenanceType, workStatus, workSummary } from '../lib/maintenance';

const TABS = [
  { value: 'em_andamento', label: 'Em manutenção' },
  { value: 'concluido', label: 'Prontos' },
  { value: 'all', label: 'Todos' },
];

function shortTitle(text) {
  const line = String(text || '').split('\n')[0].trim();
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
}

export default function Maintenance() {
  const navigate = useNavigate();
  const {
    assets, assetHistory, teams, loading,
    addAssetHistoryEntry, updateAssetHistoryEntry, removeAssetHistoryEntry,
    finishWorkOrder, reopenWorkOrder, ensureAssetByName,
  } = useData();

  const [tab, setTab] = useState('em_andamento');
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [finishing, setFinishing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const teamName = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id) => (id ? map.get(id) || '—' : 'Yard');
  }, [teams]);

  const records = useMemo(
    () => [...assetHistory].sort((a, b) => {
      const openDiff = Number(isOpenWork(b)) - Number(isOpenWork(a));
      if (openDiff) return openDiff;
      return new Date(b.date || b.created_at) - new Date(a.date || a.created_at);
    }),
    [assetHistory]
  );

  const openCount = records.filter(isOpenWork).length;
  const doneCount = records.length - openCount;
  const totalCost = records.reduce((s, r) => s + (Number(r.cost) || 0), 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const status = r.status || 'concluido';
      if (tab !== 'all' && status !== tab) return false;
      if (assetFilter !== 'all' && r.asset_id !== assetFilter) return false;
      if (!q) return true;
      const asset = assetById.get(r.asset_id);
      return [
        asset?.name, asset?.plate, asset?.vin, asset?.model,
        r.work_done, r.parts_used, r.mechanic, r.part_name, r.notes,
      ].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [records, tab, assetFilter, search, assetById]);

  /** Cria ou edita o registro; o veículo digitado vira cadastro se for novo. */
  async function handleSubmit(data) {
    const asset = data.assetId ? assetById.get(data.assetId) : await ensureAssetByName(data.vehicle);
    if (!asset) return;

    if (editing) {
      await updateAssetHistoryEntry(editing.id, {
        asset_id: asset.id,
        type: data.type,
        status: data.status,
        part_name: shortTitle(data.workDone) || maintenanceType(data.type).label,
        work_done: data.workDone,
        parts_used: data.partsUsed,
        mechanic: data.mechanic,
        odometer: data.odometer,
        cost: data.cost,
        date: data.date,
        finished_date: data.finishedDate,
      });
      setEditing(null);
      return;
    }

    await addAssetHistoryEntry({
      assetId: asset.id,
      type: data.type,
      partName: shortTitle(data.workDone) || maintenanceType(data.type).label,
      quantity: 1,
      date: data.date,
      status: data.status,
      workDone: data.workDone,
      partsUsed: data.partsUsed,
      mechanic: data.mechanic,
      odometer: data.odometer,
      cost: data.cost,
      finishedDate: data.finishedDate,
      details: data.mechanic ? { shop: data.mechanic } : null,
      asset,
    });
  }

  return (
    <div>
      <PageHeader
        title="Manutenção"
        subtitle="Registre o que foi feito em cada veículo — em andamento ou já pronto"
      >
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]"
        >
          <Plus size={15} /> Registrar manutenção
        </button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile icon={Wrench} label="Em manutenção" value={openCount} color="var(--warn)" sub="equipamentos parados" />
        <Tile icon={CheckCircle2} label="Prontos" value={doneCount} color="var(--ok)" sub="serviços concluídos" />
        <Tile icon={DollarSign} label="Custo registrado" value={fmtUSD(totalCost)} color="var(--accent)" sub="soma de todas as manutenções" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
              style={{
                background: tab === t.value ? 'var(--bg-elevated)' : 'transparent',
                color: tab === t.value ? 'var(--text)' : 'var(--text-secondary)',
                boxShadow: tab === t.value ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por veículo, serviço, peça ou mecânico…"
            className="input-apple pl-9"
          />
        </div>
        <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="input-apple w-auto min-w-[170px]">
          <option value="all">Todos os equipamentos</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[120px]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Wrench}
            title={records.length === 0 ? 'Nenhuma manutenção registrada' : 'Nada nesse filtro'}
            hint={records.length === 0
              ? 'Escreva o veículo, descreva o serviço e, se quiser, as peças usadas.'
              : 'Tente outra aba ou limpe a busca.'}
            action={records.length === 0 && (
              <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary px-4 py-2 text-[13px]">
                Registrar manutenção
              </button>
            )}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const asset = assetById.get(r.asset_id);
            const st = workStatus(r);
            const type = maintenanceType(r.type);
            return (
              <article key={r.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge" style={{ background: st.bg, color: st.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
                        {st.label}
                      </span>
                      <span className="text-[12px] font-medium" style={{ color: type.color }}>{type.label}</span>
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        {asset ? teamName(asset.team_id) : '—'}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[16px] font-bold" style={{ color: 'var(--text)' }}>
                      {asset?.name || 'Equipamento removido'}
                      {asset?.plate && (
                        <span className="ml-2 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {asset.plate}
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOpenWork(r) ? (
                      <button onClick={() => setFinishing(r)} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[12.5px]">
                        <CheckCircle2 size={13} /> Concluir
                      </button>
                    ) : (
                      <IconBtn title="Reabrir manutenção" onClick={() => reopenWorkOrder(r.id)}>
                        <RotateCcw size={13} />
                      </IconBtn>
                    )}
                    {asset && (
                      <IconBtn title="Abrir equipamento" onClick={() => navigate(`/equipamentos/asset/${asset.id}`)}>
                        <ExternalLink size={13} />
                      </IconBtn>
                    )}
                    <IconBtn title="Editar" onClick={() => { setEditing(r); setFormOpen(true); }}>
                      <Pencil size={13} />
                    </IconBtn>
                    <IconBtn title="Excluir" danger onClick={() => setConfirm(r)}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed" style={{ color: 'var(--text)' }}>
                  {workSummary(r)}
                </p>

                {r.parts_used && (
                  <div className="mt-3 rounded-lg px-3.5 py-2.5" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="label-caps">Peças usadas</p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px]" style={{ color: 'var(--text)' }}>{r.parts_used}</p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  <span>Entrada: <strong style={{ color: 'var(--text)' }}>{fmtDate(r.date)}</strong></span>
                  {r.finished_date && <span>Conclusão: <strong style={{ color: 'var(--text)' }}>{fmtDate(r.finished_date)}</strong></span>}
                  {r.mechanic && <span>Mecânico: <strong style={{ color: 'var(--text)' }}>{r.mechanic}</strong></span>}
                  {r.odometer != null && <span>Odômetro: <strong style={{ color: 'var(--text)' }}>{fmtNum(r.odometer)}</strong></span>}
                  {r.cost != null && <span>Custo: <strong style={{ color: 'var(--text)' }}>{fmtUSD(r.cost)}</strong></span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <WorkOrderModal
        open={formOpen}
        entry={editing}
        assets={assets}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <FinishModal
        entry={finishing}
        assetName={finishing ? assetById.get(finishing.asset_id)?.name : ''}
        onClose={() => setFinishing(null)}
        onConfirm={(payload) => finishWorkOrder(finishing.id, payload)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Excluir este registro de manutenção?"
        message="O histórico dessa manutenção será apagado do equipamento. Essa ação não pode ser desfeita."
        confirmLabel="Excluir registro"
        onConfirm={() => removeAssetHistoryEntry(confirm.id)}
      />
    </div>
  );
}

/** Fecha a ordem, permitindo complementar o texto do serviço no fim. */
function FinishModal({ entry, assetName, onClose, onConfirm }) {
  const [extra, setExtra] = useState('');
  const [parts, setParts] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const open = Boolean(entry);
  const initial = entry?.id;

  // Reinicia os campos a cada ordem aberta no modal
  const [lastId, setLastId] = useState(null);
  if (open && lastId !== initial) {
    setLastId(initial);
    setExtra('');
    setParts(entry.parts_used || '');
    setCost(entry.cost ?? '');
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const workDone = extra.trim()
        ? `${entry.work_done || entry.part_name || ''}\n\nConclusão: ${extra.trim()}`.trim()
        : null;
      await onConfirm({
        finishedDate: date,
        workDone,
        partsUsed: parts.trim() || null,
        cost: cost === '' ? null : Number(cost),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Concluir manutenção" subtitle={assetName} maxWidth={480}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Data de conclusão
          </label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input-apple" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Complemento do serviço (opcional)
          </label>
          <textarea
            rows={3}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="O que faltava e foi finalizado agora"
            className="input-apple resize-y"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Peças usadas (opcional)
          </label>
          <textarea rows={2} value={parts} onChange={(e) => setParts(e.target.value)} className="input-apple resize-y" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Custo total (opcional)
          </label>
          <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" className="input-apple" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : 'Marcar como pronto'}
        </button>
      </form>
    </Modal>
  );
}

function Tile({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-3.5 p-5">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="label-caps">{label}</p>
        <p className="mt-1 text-[20px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
        <p className="mt-1 truncate text-[12px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
      style={{ borderColor: 'var(--border)', color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}
