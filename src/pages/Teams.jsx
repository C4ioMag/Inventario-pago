import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Pencil, Plus, Truck, Users, Warehouse } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import TeamFormModal from '../components/TeamFormModal';
import AssetFormModal from '../components/AssetFormModal';
import AddItemModal from '../components/AddItemModal';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamPanel from '../components/TeamPanel';
import TransferModal from '../components/TransferModal';
import { fmtUSD } from '../lib/format';
import { teamLabel } from '../lib/teams';

const YARD = { id: null, name: 'Yard' };

export default function Teams() {
  const navigate = useNavigate();
  const {
    teams, assets, items, categories, loading,
    addTeam, renameTeam, removeTeam, addAsset, addItem, transferAsset, transferItem,
  } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [teamForm, setTeamForm] = useState(null);   // { team? }
  const [panel, setPanel] = useState(null);          // { team, tab }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [assetForm, setAssetForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);
  const [transfer, setTransfer] = useState(null);    // { entity, kind }

  // A busca do topo manda ?team=<id> para abrir o painel direto
  useEffect(() => {
    const wanted = searchParams.get('team');
    if (!wanted) return;
    const found = wanted === 'yard' ? YARD : teams.find((t) => t.id === wanted);
    if (found) setPanel({ team: found, tab: 'assets' });
    setSearchParams({}, { replace: true });
  }, [searchParams, teams, setSearchParams]);

  const assetsByTeam = useMemo(() => groupBy(assets, (a) => a.team_id || '__none__'), [assets]);
  const itemsByTeam = useMemo(() => groupBy(items, (i) => i.team_id || '__none__'), [items]);

  const panelKey = panel ? panel.team.id || '__none__' : null;
  const teamName = (id) => (id ? teams.find((t) => t.id === id)?.name || '—' : null);

  function stockValue(key) {
    return (itemsByTeam.get(key) || []).reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  }

  return (
    <div>
      <PageHeader
        title="Equipes"
        subtitle={`${teams.length} equipe(s) · ${assets.length} equipamento(s) e ${items.length} item(ns) distribuídos`}
      >
        <button onClick={() => setTeamForm({})} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Nova equipe
        </button>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[150px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TeamCard
            label="Yard"
            sub="Estoque e equipamentos sem equipe"
            assetsCount={(assetsByTeam.get('__none__') || []).length}
            itemsCount={(itemsByTeam.get('__none__') || []).length}
            value={stockValue('__none__')}
            icon={<Warehouse size={15} />}
            onOpen={(tab) => setPanel({ team: YARD, tab })}
          />
          {teams.map((t, idx) => (
            <TeamCard
              key={t.id}
              label={teamLabel(t)}
              sub={t.supervisor ? `Supervisor · ${t.supervisor}` : 'Equipe'}
              assetsCount={(assetsByTeam.get(t.id) || []).length}
              itemsCount={(itemsByTeam.get(t.id) || []).length}
              value={stockValue(t.id)}
              onOpen={(tab) => setPanel({ team: t, tab })}
              onEdit={() => setTeamForm({ team: t })}
              delay={idx * 0.03}
            />
          ))}
          <button
            onClick={() => setTeamForm({})}
            className="row-hover flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
          >
            <Users size={20} strokeWidth={1.7} />
            <span className="text-[13px] font-medium">Criar nova equipe</span>
          </button>
        </div>
      )}

      <TeamFormModal
        open={Boolean(teamForm)}
        team={teamForm?.team}
        onClose={() => setTeamForm(null)}
        onSubmit={(fields) => (teamForm?.team ? renameTeam(teamForm.team.id, fields) : addTeam(fields))}
      />

      <TeamPanel
        open={Boolean(panel)}
        team={panel?.team}
        initialTab={panel?.tab}
        assets={panelKey ? assetsByTeam.get(panelKey) || [] : []}
        items={panelKey ? itemsByTeam.get(panelKey) || [] : []}
        onClose={() => setPanel(null)}
        onOpenAsset={(a) => navigate(`/equipamentos/asset/${a.id}`)}
        onAddAsset={() => setAssetForm({ defaultTeamId: panel?.team.id || '' })}
        onAddItem={() => setItemForm({ defaultTeamId: panel?.team.id || '' })}
        onTransferAsset={(a) => setTransfer({ entity: a, kind: 'asset' })}
        onTransferItem={(i) => setTransfer({ entity: i, kind: 'item' })}
        onRename={renameTeam}
        onEdit={() => setTeamForm({ team: panel?.team })}
        onDelete={() => setConfirmDelete(panel?.team)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={`Excluir "${confirmDelete?.name}"?`}
        message="Os equipamentos e itens desta equipe não serão apagados — eles voltam para o Yard."
        confirmLabel="Excluir equipe"
        onConfirm={async () => {
          await removeTeam(confirmDelete.id);
          setPanel(null);
        }}
      />

      <AssetFormModal
        open={Boolean(assetForm)}
        defaultTeamId={assetForm?.defaultTeamId}
        teams={teams}
        categories={categories}
        onClose={() => setAssetForm(null)}
        onSubmit={(fields, maintenance) => addAsset(fields, maintenance)}
      />

      <AddItemModal
        open={Boolean(itemForm)}
        defaultTeamId={itemForm?.defaultTeamId}
        teams={teams}
        onClose={() => setItemForm(null)}
        onSubmit={(fields) => addItem(fields)}
      />

      <TransferModal
        open={Boolean(transfer)}
        entity={transfer?.entity}
        kind={transfer?.kind}
        teams={teams}
        teamNameOf={teamName}
        onClose={() => setTransfer(null)}
        onSubmit={transfer?.kind === 'item' ? transferItem : transferAsset}
      />
    </div>
  );
}

function groupBy(rows, keyOf) {
  const map = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

function TeamCard({ label, sub, assetsCount, itemsCount, value, onOpen, onEdit, icon, delay = 0 }) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onOpen('assets')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen('assets'); } }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="card row-hover flex cursor-pointer flex-col p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
          <p className="mt-0.5 truncate text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
        </div>
        {onEdit ? (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar equipe"
            aria-label={`Editar ${label}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Pencil size={12} />
          </button>
        ) : (
          icon && <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
        )}
      </div>

      <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>
        {fmtUSD(value)} em estoque
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ViewButton icon={Truck} count={assetsCount} label="Equipamentos" onClick={(e) => { e.stopPropagation(); onOpen('assets'); }} />
        <ViewButton icon={Package} count={itemsCount} label="Itens" onClick={(e) => { e.stopPropagation(); onOpen('items'); }} />
      </div>
    </motion.div>
  );
}

function ViewButton({ icon: Icon, count, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="row-hover flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors"
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
        <Icon size={13} />
        <span className="text-[11.5px] font-medium">{label}</span>
      </span>
      <span className="text-[19px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>{count}</span>
    </button>
  );
}
