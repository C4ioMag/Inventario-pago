import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Download, MessageSquarePlus, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { MOVEMENT_KINDS, movementKind } from '../lib/movements';
import { exportMovementsPDF } from '../lib/pdf';
import { fmtDateTime } from '../lib/format';
import { teamLabel } from '../lib/teams';

const PAGE = 40;

export default function History() {
  const { movements, teams, loading, updateMovementNotes } = useData();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('transferencia');
  const [teamFilter, setTeamFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE);
  const [noteFor, setNoteFor] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => {
      if (kindFilter !== 'all' && m.kind !== kindFilter) return false;
      if (entityFilter !== 'all' && m.entity_type !== entityFilter) return false;
      if (teamFilter !== 'all') {
        const key = m.team_id || 'none';
        if (key !== teamFilter) return false;
      }
      if (!q) return true;
      return [m.entity_name, m.description, m.notes, m.team_name, m.user_name]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [movements, search, kindFilter, teamFilter, entityFilter]);

  return (
    <div>
      <PageHeader
        title="Histórico"
        subtitle="Transferências e movimentações, com o motivo de cada uma"
      >
        <button
          onClick={() => exportMovementsPDF(filtered)}
          disabled={filtered.length === 0}
          className="btn-ghost flex items-center gap-2 px-3.5 py-2 text-[13px]"
        >
          <Download size={15} /> Exportar PDF
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisible(PAGE); }}
            placeholder="Buscar por equipamento, item, motivo…"
            className="input-apple pl-9"
          />
        </div>
        <select value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setVisible(PAGE); }} className="input-apple w-auto min-w-[160px]">
          <option value="transferencia">Só transferências</option>
          <option value="all">Todas as movimentações</option>
          {Object.entries(MOVEMENT_KINDS)
            .filter(([k]) => k !== 'transferencia')
            .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setVisible(PAGE); }} className="input-apple w-auto min-w-[140px]">
          <option value="all">Itens e equipamentos</option>
          <option value="item">Somente itens</option>
          <option value="asset">Somente equipamentos</option>
        </select>
        <select value={teamFilter} onChange={(e) => { setTeamFilter(e.target.value); setVisible(PAGE); }} className="input-apple w-auto min-w-[140px]">
          <option value="all">Todas as equipes</option>
          <option value="none">Yard</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{teamLabel(t)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-11" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={movements.length === 0 ? 'Nenhuma movimentação ainda' : 'Nenhum resultado para esse filtro'}
            hint={movements.length === 0
              ? 'Assim que você transferir itens ou equipamentos, tudo aparece aqui com data, motivo e responsável.'
              : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Data</th><th>Tipo</th><th>Registro</th><th>Movimentação</th>
                    <th className="!text-right">Qtd</th><th>Observação</th><th>Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, visible).map((m) => {
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
                        <td className="cell-strong">{m.entity_name}</td>
                        <td>{m.description}</td>
                        <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>
                          {m.quantity ?? '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => setNoteFor(m)}
                            className="flex items-center gap-1.5 text-left transition-colors hover:underline"
                            style={{ color: m.notes ? 'var(--text)' : 'var(--text-tertiary)' }}
                            title={m.notes ? 'Editar observação' : 'Adicionar observação'}
                          >
                            {m.notes || <><MessageSquarePlus size={13} /> Adicionar</>}
                          </button>
                        </td>
                        <td>{m.user_name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visible < filtered.length && (
              <button
                onClick={() => setVisible((v) => v + PAGE)}
                className="row-hover w-full border-t py-3 text-[13px] font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Carregar mais ({filtered.length - visible} restantes)
              </button>
            )}
          </>
        )}
      </div>

      <NoteModal
        open={Boolean(noteFor)}
        movement={noteFor}
        onClose={() => setNoteFor(null)}
        onSubmit={(notes) => updateMovementNotes(noteFor.id, notes)}
      />
    </div>
  );
}

function NoteModal({ open, movement, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setText(movement?.notes || ''); }, [open, movement]);

  if (!movement) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(text);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Observação" subtitle={movement.description} maxWidth={440}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <textarea
          autoFocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex: veio para o Yard Apopka pois estava quebrada"
          className="input-apple resize-none"
        />
        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : 'Salvar observação'}
        </button>
      </form>
    </Modal>
  );
}
