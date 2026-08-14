import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftRight, ChevronLeft, Pencil, Trash2, Wrench } from 'lucide-react';
import { useData } from '../context/DataContext';
import AssetFormModal from '../components/AssetFormModal';
import PartHistoryModal from '../components/PartHistoryModal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { fmtDate, fmtDateTime } from '../lib/format';
import { movementKind } from '../lib/movements';

export default function AssetDetail() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const {
    teams, assets, items, assetHistory, movements, registries, loading,
    updateAsset, removeAsset, addAssetHistoryEntry,
  } = useData();

  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const asset = assets.find((a) => a.id === assetId);
  const team = teams.find((t) => t.id === asset?.team_id);

  const history = useMemo(
    () => assetHistory
      .filter((h) => h.asset_id === assetId)
      .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at)),
    [assetHistory, assetId]
  );

  const assetMovements = useMemo(
    () => movements.filter((m) => m.entity_type === 'asset' && m.entity_id === assetId),
    [movements, assetId]
  );

  const availableItems = useMemo(
    () => items.filter((i) => (i.team_id || null) === (asset?.team_id || null) && Number(i.quantity) > 0),
    [items, asset]
  );

  if (loading) return <div className="skeleton h-[320px]" />;
  if (!asset) {
    return (
      <div className="py-20 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>Equipamento não encontrado.</p>
      </div>
    );
  }

  const nameOf = (list, id) => (id ? list.find((r) => r.id === id)?.name || '—' : '—');

  const FIELDS = [
    ['Tipo', asset.tipo],
    ['Modelo', asset.model],
    ['Ano', asset.year],
    ['Placa', asset.plate],
    ['VIN Number', asset.vin],
    ['Equipe', team?.name || 'Sem equipe'],
    ['Supervisor', asset.supervisor],
    ['Proprietário', asset.owner],
    ['Categoria', nameOf(registries.categories, asset.category_id)],
    ['Marca', nameOf(registries.brands, asset.brand_id)],
    ['Local', nameOf(registries.locations, asset.location_id)],
    ['Verizon', asset.verizon],
    ['Bouncie', asset.bouncie],
    ['Samsung', asset.samsung],
    ['E-ZPass', asset.e_pass],
  ];

  return (
    <div>
      <button
        onClick={() => navigate('/equipamentos')}
        className="btn-ghost mb-5 flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
      >
        <ChevronLeft size={15} /> Equipamentos
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="label-caps">{asset.tipo || 'Equipamento'}</p>
            <StatusBadge status={asset.status || 'disponivel'} />
          </div>
          <h1 className="mt-1.5 text-[24px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {asset.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="btn-ghost flex items-center gap-2 px-3.5 py-2 text-[13px]">
            <Pencil size={14} /> Editar
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="btn-ghost flex h-[38px] w-[38px] items-center justify-center"
            title="Excluir equipamento"
            aria-label="Excluir equipamento"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section className="card overflow-hidden">
          <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Informações</h2>
          </div>
          <div className="row-divide">
            {FIELDS.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-[13.5px] font-medium" style={{ color: value ? 'var(--text)' : 'var(--text-tertiary)' }}>
                  {value || '—'}
                </span>
              </div>
            ))}
            {asset.notes && (
              <div className="px-5 py-3.5">
                <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Observações</span>
                <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text)' }}>{asset.notes}</p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                Histórico de peças trocadas
              </h2>
              <button onClick={() => setHistoryOpen(true)} className="btn-primary flex items-center gap-2 px-3 py-1.5 text-[12.5px]">
                <Wrench size={13} /> Registrar troca
              </button>
            </div>
            {history.length === 0 ? (
              <EmptyState icon={Wrench} title="Nenhuma troca registrada" hint="Registre peças trocadas para manter a manutenção rastreada." />
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr><th>Peça</th><th>Observação</th><th className="!text-right">Qtd</th><th className="!text-right">Data</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="cell-strong">{h.part_name}</td>
                        <td>{h.notes || '—'}</td>
                        <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{h.quantity}</td>
                        <td className="whitespace-nowrap text-right tabular-nums">{fmtDate(h.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Movimentações deste equipamento</h2>
            </div>
            {assetMovements.length === 0 ? (
              <EmptyState icon={ArrowLeftRight} title="Nenhuma movimentação" hint="Transferências de equipe, mudanças de status e trocas aparecem aqui." />
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Usuário</th></tr>
                  </thead>
                  <tbody>
                    {assetMovements.slice(0, 20).map((m) => {
                      const k = movementKind(m.kind);
                      return (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap tabular-nums">{fmtDateTime(m.created_at)}</td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium" style={{ color: k.color }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.color }} />
                              {k.label}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text)' }}>{m.description}</td>
                          <td>{m.user_name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <AssetFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={(fields) => updateAsset(asset.id, fields)}
        asset={asset}
        teams={teams}
        registries={registries}
      />

      <PartHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSubmit={(entry) => addAssetHistoryEntry({ assetId: asset.id, ...entry })}
        items={availableItems}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Excluir "${asset.name}"?`}
        message="O equipamento e todo o histórico de peças dele serão apagados. Essa ação não pode ser desfeita."
        confirmLabel="Excluir equipamento"
        onConfirm={async () => {
          await removeAsset(asset.id);
          navigate('/equipamentos');
        }}
      />
    </div>
  );
}
