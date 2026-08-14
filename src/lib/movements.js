export const MOVEMENT_KINDS = {
  entrada: { label: 'Entrada', color: 'var(--ok)' },
  saida: { label: 'Saída', color: 'var(--danger)' },
  transferencia: { label: 'Transferência', color: 'var(--info)' },
  manutencao: { label: 'Manutenção', color: 'var(--warn)' },
  troca_peca: { label: 'Troca de peça', color: 'var(--violet)' },
  cadastro: { label: 'Cadastro', color: 'var(--info)' },
  edicao: { label: 'Edição', color: 'var(--text-secondary)' },
  exclusao: { label: 'Exclusão', color: 'var(--danger)' },
};

export function movementKind(kind) {
  return MOVEMENT_KINDS[kind] || { label: kind, color: 'var(--text-secondary)' };
}

/**
 * Série diária dos últimos `days` dias contando movimentações que passam no filtro.
 * Usada nos sparklines dos cards — reflete dados reais, não números decorativos.
 */
export function dailySeries(movements, days = 14, filter = () => true) {
  const buckets = new Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const m of movements) {
    if (!filter(m)) continue;
    const d = new Date(m.created_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today - d) / 86400000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
  }
  return buckets;
}

/** Série cumulativa: quantos registros existiam ao final de cada dia. */
export function cumulativeSeries(rows, days = 14) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - i);
    out.push(rows.filter((r) => new Date(r.created_at) <= cutoff).length);
  }
  return out;
}

export function movementsThisMonth(movements) {
  const now = new Date();
  return movements.filter((m) => {
    const d = new Date(m.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}
