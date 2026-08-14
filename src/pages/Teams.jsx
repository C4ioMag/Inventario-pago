import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, Users, Warehouse } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import CreateTeamModal from '../components/CreateTeamModal';
import AssetFormModal from '../components/AssetFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamPanel from '../components/TeamPanel';
import { fmtUSD } from '../lib/format';

const UNASSIGNED = { id: null, name: 'Sem equipe' };

export default function Teams() {
  const navigate = useNavigate();
  const {
    teams, assets, items, registries, loading,
    addTeam, renameTeam, removeTeam, addAsset,
  } = useData();

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [panelTeam, setPanelTeam] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [assetForm, setAssetForm] = useState(null);

  const assetsByTeam = useMemo(() => groupBy(assets, (a) => a.team_id || '__none__'), [assets]);
  const itemsByTeam = useMemo(() => groupBy(items, (i) => i.team_id || '__none__'), [items]);

  const panelKey = panelTeam ? panelTeam.id || '__none__' : null;

  function stockValue(key) {
    return (itemsByTeam.get(key) || []).reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  }

  return (
    <div>
      <PageHeader
        title="Equipes"
        subtitle={`${teams.length} equipe(s) · ${assets.length} equipamento(s) distribuído(s)`}
      >
        <button onClick={() => setCreateTeamOpen(true)} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Nova equipe
        </button>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[112px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TeamTile
            label="Sem equipe"
            sub="Pátio · não atribuído"
            assetsCount={(assetsByTeam.get('__none__') || []).length}
            itemsCount={(itemsByTeam.get('__none__') || []).length}
            value={stockValue('__none__')}
            icon={<Warehouse size={15} />}
            onClick={() => setPanelTeam(UNASSIGNED)}
          />
          {teams.map((t, idx) => (
            <TeamTile
              key={t.id}
              label={t.name}
              sub={t.supervisor ? `Supervisor · ${t.supervisor}` : 'Equipe'}
              assetsCount={(assetsByTeam.get(t.id) || []).length}
              itemsCount={(itemsByTeam.get(t.id) || []).length}
              value={stockValue(t.id)}
              onClick={() => setPanelTeam(t)}
              delay={idx * 0.03}
            />
          ))}
          <button
            onClick={() => setCreateTeamOpen(true)}
            className="row-hover flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
          >
            <Users size={20} strokeWidth={1.7} />
            <span className="text-[13px] font-medium">Criar nova equipe</span>
          </button>
        </div>
      )}

      <CreateTeamModal open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} onSubmit={addTeam} />

      <TeamPanel
        open={Boolean(panelTeam)}
        team={panelTeam}
        assets={panelKey ? assetsByTeam.get(panelKey) || [] : []}
        items={panelKey ? itemsByTeam.get(panelKey) || [] : []}
        onClose={() => setPanelTeam(null)}
        onOpenAsset={(a) => navigate(`/equipamentos/asset/${a.id}`)}
        onAddAsset={() => setAssetForm({ defaultTeamId: panelTeam?.id || '' })}
        onRename={renameTeam}
        onDelete={() => setConfirmDelete(panelTeam)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={`Excluir "${confirmDelete?.name}"?`}
        message="Os equipamentos e itens desta equipe não serão apagados — eles voltam para “Sem equipe”."
        confirmLabel="Excluir equipe"
        onConfirm={async () => {
          await removeTeam(confirmDelete.id);
          setPanelTeam(null);
        }}
      />

      <AssetFormModal
        open={Boolean(assetForm)}
        defaultTeamId={assetForm?.defaultTeamId}
        teams={teams}
        registries={registries}
        onClose={() => setAssetForm(null)}
        onSubmit={(fields) => addAsset(fields)}
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

function TeamTile({ label, sub, assetsCount, itemsCount, value, onClick, icon, delay = 0 }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="card row-hover p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
          <p className="mt-0.5 truncate text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
        </div>
        <span style={{ color: 'var(--text-tertiary)' }}>{icon || <ChevronRight size={16} />}</span>
      </div>

      <div className="mt-4 flex items-end gap-5">
        <Metric value={assetsCount} label="equipamentos" />
        <Metric value={itemsCount} label="itens" />
        <div className="ml-auto text-right">
          <p className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{fmtUSD(value)}</p>
          <p className="label-caps mt-0.5">em estoque</p>
        </div>
      </div>
    </motion.button>
  );
}

function Metric({ value, label }) {
  return (
    <div>
      <p className="text-[21px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="label-caps mt-1">{label}</p>
    </div>
  );
}
