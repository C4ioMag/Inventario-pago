import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ClipboardCheck, Clock, ExternalLink, Plus, RotateCcw, Search, Trash2, XCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ReviewRequestModal from '../components/ReviewRequestModal';
import { fmtDateTime } from '../lib/format';

const STATUS = {
  pendente: { label: 'Em revisão', color: 'var(--warn)', bg: 'var(--warn-soft)' },
  confirmado: { label: 'Recebido', color: 'var(--ok)', bg: 'var(--ok-soft)' },
  nao_recebido: { label: 'Não recebido', color: 'var(--danger)', bg: 'var(--danger-soft)' },
};

const TABS = [
  { value: 'pendente', label: 'Em revisão' },
  { value: 'confirmado', label: 'Recebidos' },
  { value: 'nao_recebido', label: 'Não recebidos' },
  { value: 'all', label: 'Todos' },
];

export default function Reviews() {
  const navigate = useNavigate();
  const {
    reviews, assets, items, teams, loading,
    requestReview, confirmReview, rejectReview, reopenReview, removeReview,
  } = useData();

  const [tab, setTab] = useState('pendente');
  const [search, setSearch] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [decision, setDecision] = useState(null);   // { review, kind: 'confirmar' | 'recusar' }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const counts = useMemo(() => ({
    pendente: reviews.filter((r) => r.status === 'pendente').length,
    confirmado: reviews.filter((r) => r.status === 'confirmado').length,
    nao_recebido: reviews.filter((r) => r.status === 'nao_recebido').length,
  }), [reviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!q) return true;
      return [r.entity_name, r.from_team_name, r.to_team_name, r.notes, r.review_notes]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [reviews, tab, search]);

  const openAsset = (r) => {
    if (r.entity_type === 'asset' && assets.some((a) => a.id === r.entity_id)) {
      navigate(`/equipamentos/asset/${r.entity_id}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Revisão"
        subtitle="Confira se o que saiu de uma equipe chegou mesmo na outra"
      >
        <button onClick={() => setRequestOpen(true)} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Enviar para revisão
        </button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile icon={Clock} label="Em revisão" value={counts.pendente} color="var(--warn)" sub="aguardando confirmação" />
        <Tile icon={CheckCircle2} label="Recebidos" value={counts.confirmado} color="var(--ok)" sub="transferência concluída" />
        <Tile icon={XCircle} label="Não recebidos" value={counts.nao_recebido} color="var(--danger)" sub="ficaram na origem" />
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
            placeholder="Buscar por equipamento, equipe ou observação…"
            className="input-apple pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-[110px]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardCheck}
            title={reviews.length === 0 ? 'Nada em revisão' : 'Nada nesta aba'}
            hint={reviews.length === 0
              ? 'Mande um equipamento para revisão quando ele sair de uma equipe para outra — a transferência só vale quando o destino confirmar.'
              : 'Tente outra aba ou limpe a busca.'}
            action={reviews.length === 0 && (
              <button onClick={() => setRequestOpen(true)} className="btn-primary px-4 py-2 text-[13px]">
                Enviar para revisão
              </button>
            )}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const st = STATUS[r.status] || STATUS.pendente;
            return (
              <article key={r.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge" style={{ background: st.bg, color: st.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
                        {st.label}
                      </span>
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        {r.entity_type === 'item' ? 'Item de estoque' : 'Equipamento'}
                        {r.quantity ? ` · ${r.quantity} un.` : ''} · enviado em {fmtDateTime(r.created_at)}
                        {r.requested_by ? ` por ${r.requested_by}` : ''}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[16px] font-bold" style={{ color: 'var(--text)' }}>{r.entity_name}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text)' }}>{r.from_team_name || 'Yard'}</strong>
                      <ArrowRight size={13} />
                      <strong style={{ color: r.status === 'confirmado' ? 'var(--ok)' : 'var(--accent)' }}>
                        {r.to_team_name || 'Yard'}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {r.status === 'pendente' ? (
                      <>
                        <button
                          onClick={() => setDecision({ review: r, kind: 'confirmar' })}
                          className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[12.5px]"
                        >
                          <CheckCircle2 size={13} /> Recebeu
                        </button>
                        <button
                          onClick={() => setDecision({ review: r, kind: 'recusar' })}
                          className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[12.5px]"
                          style={{ color: 'var(--danger)' }}
                        >
                          <XCircle size={13} /> Não recebeu
                        </button>
                      </>
                    ) : (
                      <IconBtn title="Reabrir revisão" onClick={() => reopenReview(r.id)}>
                        <RotateCcw size={13} />
                      </IconBtn>
                    )}
                    {r.entity_type === 'asset' && (
                      <IconBtn title="Abrir equipamento" onClick={() => openAsset(r)}>
                        <ExternalLink size={13} />
                      </IconBtn>
                    )}
                    <IconBtn title="Excluir" danger onClick={() => setConfirmDelete(r)}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>

                {(r.notes || r.review_notes) && (
                  <div className="mt-3 space-y-1 rounded-lg px-3.5 py-2.5" style={{ background: 'var(--bg-secondary)' }}>
                    {r.notes && (
                      <p className="text-[12.5px]" style={{ color: 'var(--text)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Na saída: </span>{r.notes}
                      </p>
                    )}
                    {r.review_notes && (
                      <p className="text-[12.5px]" style={{ color: 'var(--text)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Na conferência: </span>{r.review_notes}
                      </p>
                    )}
                  </div>
                )}

                {r.reviewed_at && (
                  <p className="mt-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    Conferido em {fmtDateTime(r.reviewed_at)}{r.reviewed_by ? ` por ${r.reviewed_by}` : ''}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ReviewRequestModal
        open={requestOpen}
        assets={assets}
        items={items}
        teams={teams}
        onClose={() => setRequestOpen(false)}
        onSubmit={requestReview}
      />

      <DecisionModal
        decision={decision}
        onClose={() => setDecision(null)}
        onConfirm={(notes) => (decision.kind === 'confirmar'
          ? confirmReview(decision.review.id, notes)
          : rejectReview(decision.review.id, notes))}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Excluir esta revisão?"
        message="O registro sai da lista. Nada é transferido nem desfeito."
        confirmLabel="Excluir"
        onConfirm={() => removeReview(confirmDelete.id)}
      />
    </div>
  );
}

/** Confirma o recebimento (que efetiva a transferência) ou registra que não chegou. */
function DecisionModal({ decision, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastId, setLastId] = useState(null);

  const open = Boolean(decision);
  const isConfirm = decision?.kind === 'confirmar';
  if (open && lastId !== decision.review.id + decision.kind) {
    setLastId(decision.review.id + decision.kind);
    setNotes('');
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(notes);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isConfirm ? 'Confirmar recebimento' : 'Não foi recebido'}
      subtitle={decision ? `${decision.review.entity_name} · ${decision.review.from_team_name} → ${decision.review.to_team_name}` : ''}
      maxWidth={440}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {isConfirm
            ? `Ao confirmar, a transferência é feita: o registro passa para ${decision?.review.to_team_name}.`
            : `Nada é movido — continua em ${decision?.review.from_team_name}. Diga o que aconteceu para ficar registrado.`}
        </p>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Observação {isConfirm ? '(opcional)' : ''}
          </label>
          <textarea
            rows={3}
            required={!isConfirm}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isConfirm ? 'Ex: conferido com o Leandro' : 'Ex: ficou no yard, ninguém buscou'}
            className="input-apple resize-y"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-2.5 text-[14px]"
          style={isConfirm ? undefined : { background: 'var(--danger)' }}
        >
          {saving ? 'Salvando…' : isConfirm ? 'Confirmar e transferir' : 'Registrar que não recebeu'}
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
