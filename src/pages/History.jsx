import { useMemo, useState } from 'react';
import { ArrowLeftRight, Download, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { MOVEMENT_KINDS, movementKind } from '../lib/movements';
import { exportMovementsPDF } from '../lib/pdf';
import { fmtDateTime } from '../lib/format';

const PAGE = 40;

export default function History() {
  const { movements, teams, loading } = useData();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE);

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
      return [m.entity_name, m.description, m.team_name, m.user_name]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [movements, search, kindFilter, teamFilter, entityFilter]);

  return (
    <div>
      <PageHeader
        title="Histórico"
        subtitle="Toda entrada, saída, transferência e troca de peça fica registrada aqui"
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
            placeholder="Buscar por equipamento, item ou descrição…"
            className="input-apple pl-9"
          />
        </div>
        <select value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setVisible(PAGE); }} className="input-apple w-auto min-w-[150px]">
          <option value="all">Todos os tipos</option>
          {Object.entries(MOVEMENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setVisible(PAGE); }} className="input-apple w-auto min-w-[140px]">
          <option value="all">Itens e equipamentos</option>
          <option value="item">Somente itens</option>
          <option value="asset">Somente equipamentos</option>
        </select>
        <select value={teamFilter} onChange={(e) => { setTeamFilter(e.target.value); setVisible(PAGE); }} className="input-apple w-auto min-w-[140px]">
          <option value="all">Todas as equipes</option>
          <option value="none">Yard</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
              ? 'Assim que você registrar entradas, saídas ou trocas de peça, tudo aparece aqui com data e responsável.'
              : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Data</th><th>Tipo</th><th>Registro</th><th>Descrição</th>
                    <th className="!text-right">Qtd</th><th>Equipe</th><th>Usuário</th>
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
                        <td>{m.team_name || 'Yard'}</td>
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
    </div>
  );
}
