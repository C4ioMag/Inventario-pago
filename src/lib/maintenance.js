export const MAINTENANCE_TYPES = {
  oleo: { label: 'Troca de óleo', color: 'var(--warn)' },
  peca: { label: 'Troca de peça', color: 'var(--violet)' },
  manutencao: { label: 'Manutenção', color: 'var(--info)' },
  revisao: { label: 'Revisão', color: 'var(--ok)' },
  pneu: { label: 'Pneu', color: 'var(--text-secondary)' },
};

export function maintenanceType(type) {
  return MAINTENANCE_TYPES[type] || MAINTENANCE_TYPES.peca;
}

/**
 * Previsão da próxima troca de óleo.
 * Precisa de intervalo + odômetro da última troca; o odômetro atual diz quanto falta.
 */
export function oilStatus(asset) {
  const interval = Number(asset?.oil_interval) || 0;
  const lastOdo = Number(asset?.last_oil_odometer);
  const odo = Number(asset?.odometer);

  if (!interval || !Number.isFinite(lastOdo)) {
    return { configured: false, label: 'Não configurada' };
  }

  const next = lastOdo + interval;
  if (!Number.isFinite(odo)) {
    return { configured: true, next, remaining: null, level: 'ok', label: `Aos ${fmtNum(next)}` };
  }

  const remaining = next - odo;
  const level = remaining <= 0 ? 'atrasada' : remaining <= interval * 0.15 ? 'proxima' : 'ok';
  const label = remaining <= 0
    ? `Atrasada ${fmtNum(Math.abs(remaining))}`
    : `Faltam ${fmtNum(remaining)}`;
  return { configured: true, next, remaining, level, label };
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

/** Equipamentos com troca de óleo vencida ou perto de vencer. */
export function oilAlerts(assets) {
  return assets
    .map((a) => ({ asset: a, oil: oilStatus(a) }))
    .filter(({ oil }) => oil.configured && (oil.level === 'atrasada' || oil.level === 'proxima'))
    .sort((a, b) => (a.oil.remaining ?? 0) - (b.oil.remaining ?? 0));
}
