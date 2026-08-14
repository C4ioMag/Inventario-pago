import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, UsersRound, Warehouse } from 'lucide-react';
import { useData } from '../context/DataContext';
import CreateTeamModal from '../components/CreateTeamModal';
import AssetFormModal from '../components/AssetFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamPanel from '../components/TeamPanel';
import AssetsTable from '../components/AssetsTable';

const UNASSIGNED = { id: null, name: 'Sem equipe' };

export default function Teams() {
  const navigate = useNavigate();
  const {
    teams, assets, items, loading,
    addTeam, renameTeam, removeTeam, addAsset, updateAsset,
  } = useData();

  const [tab, setTab] = useState('teams');
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [panelTeam, setPanelTeam] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [assetForm, setAssetForm] = useState(null); // { asset?, defaultTeamId }

  const assetsByTeam = useMemo(() => {
    const map = new Map();
    for (const a of assets) {
      const key = a.team_id || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return map;
  }, [assets]);

  const itemsByTeam = useMemo(() => {
    const map = new Map();
    for (const i of items) {
      const key = i.team_id || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    }
    return map;
  }, [items]);

  const panelKey = panelTeam ? panelTeam.id || '__none__' : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Equipamentos</h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {teams.length} equipe{teams.length !== 1 ? 's' : ''} · {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'teams' ? (
            <button onClick={() => setCreateTeamOpen(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[13px]">
              <UsersRound size={15} /> Nova equipe
            </button>
          ) : (
            <button onClick={() => setAssetForm({ defaultTeamId: '' })} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[13px]">
              <Plus size={15} /> Novo asset
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 inline-flex gap-1 rounded-full p-1" style={{ background: 'var(--bg-secondary)' }}>
        <SubTab active={tab === 'teams'} onClick={() => setTab('teams')}>Equipes</SubTab>
        <SubTab active={tab === 'assets'} onClick={() => setTab('assets')}>Todos os assets</SubTab>
      </div>

      {tab === 'teams' ? (
        loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[92px] rounded-[16px]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TeamTile
              label="Sem equipe"
              sub="Pátio · não atribuído"
              count={(assetsByTeam.get('__none__') || []).length}
              onClick={() => setPanelTeam(UNASSIGNED)}
              icon={<Warehouse size={16} />}
            />
            {teams.map((t, idx) => (
              <TeamTile
                key={t.id}
                label={t.name}
                sub={`${(itemsByTeam.get(t.id) || []).length} item(ns) de estoque`}
                count={(assetsByTeam.get(t.id) || []).length}
                onClick={() => setPanelTeam(t)}
                delay={idx * 0.03}
              />
            ))}
          </div>
        )
      ) : (
        <AssetsTable
          assets={assets}
          teams={teams}
          onOpen={(a) => navigate(`/equipamentos/asset/${a.id}`)}
          onEdit={(a) => setAssetForm({ asset: a })}
        />
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
        message="Os veículos e itens de estoque desta equipe não serão apagados — eles voltam para “Sem equipe”."
        confirmLabel="Excluir equipe"
        onConfirm={async () => {
          await removeTeam(confirmDelete.id);
          setPanelTeam(null);
        }}
      />

      <AssetFormModal
        open={Boolean(assetForm)}
        asset={assetForm?.asset}
        defaultTeamId={assetForm?.defaultTeamId}
        teams={teams}
        onClose={() => setAssetForm(null)}
        onSubmit={(fields) => (assetForm?.asset ? updateAsset(assetForm.asset.id, fields) : addAsset(fields))}
      />
    </div>
  );
}

function SubTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors"
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

function TeamTile({ label, sub, count, onClick, icon, delay = 0 }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="row-hover surface flex items-center justify-between rounded-[16px] p-5 text-left"
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
        <p className="mt-0.5 truncate text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-[22px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>{count}</p>
          <p className="label-caps mt-1">veículos</p>
        </div>
        <span style={{ color: 'var(--text-tertiary)' }}>{icon || <ChevronRight size={16} />}</span>
      </div>
    </motion.button>
  );
}
