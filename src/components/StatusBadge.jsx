const STATUS = {
  disponivel: { label: 'Disponível', color: 'var(--ok)', bg: 'var(--ok-soft)' },
  em_uso: { label: 'Em uso', color: 'var(--info)', bg: 'var(--info-soft)' },
  manutencao: { label: 'Manutenção', color: 'var(--warn)', bg: 'var(--warn-soft)' },
  indisponivel: { label: 'Indisponível', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  sem_estoque: { label: 'Sem estoque', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  baixo: { label: 'Estoque baixo', color: 'var(--warn)', bg: 'var(--warn-soft)' },
};

export const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'em_uso', label: 'Em uso' },
  { value: 'manutencao', label: 'Manutenção' },
];

/** Status efetivo de um item: quantidade manda, salvo se estiver marcado em manutenção. */
export function itemStatus(item) {
  if (item.status === 'manutencao') return 'manutencao';
  if (Number(item.quantity) <= 0) return 'sem_estoque';
  if (Number(item.quantity) <= Number(item.min_quantity || 0)) return 'baixo';
  return 'disponivel';
}

export default function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.disponivel;
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
