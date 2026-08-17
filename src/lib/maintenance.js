/**
 * Cada tipo de manutenção pede campos diferentes.
 * `fields` descreve os inputs específicos que o formulário monta.
 */
export const MAINTENANCE_TYPES = {
  manutencao: {
    label: 'Manutenção geral',
    color: 'var(--warn)',
    defaultName: '',
    nameLabel: 'Resumo do serviço',
    namePlaceholder: 'Ex: Vazamento no sistema hidráulico',
    fields: [
      { key: 'shop', label: 'Oficina / mecânico', placeholder: 'Quem executou' },
    ],
  },
  oleo: {
    label: 'Troca de óleo',
    color: 'var(--warn)',
    defaultName: 'Troca de óleo',
    requiresOdometer: true,
    fields: [
      { key: 'oil_type', label: 'Tipo de óleo', placeholder: 'Ex: 15W40 sintético' },
      { key: 'oil_qty', label: 'Litros / quartos', type: 'number', step: '0.1', placeholder: 'Ex: 12' },
      { key: 'oil_filter', label: 'Filtro de óleo', placeholder: 'Marca / código' },
      { key: 'fuel_filter', label: 'Filtro de combustível', placeholder: 'Marca / código' },
      { key: 'air_filter', label: 'Filtro de ar', placeholder: 'Marca / código' },
      { key: 'shop', label: 'Oficina / responsável', placeholder: 'Quem executou' },
    ],
  },
  pneu: {
    label: 'Troca de pneus',
    color: 'var(--info)',
    defaultName: 'Troca de pneus',
    fields: [
      {
        key: 'positions',
        label: 'Posições trocadas',
        type: 'checkboxes',
        options: ['Dianteiro esq.', 'Dianteiro dir.', 'Traseiro esq.', 'Traseiro dir.', 'Estepe', 'Todos'],
      },
      { key: 'tire_brand', label: 'Marca', placeholder: 'Ex: Michelin' },
      { key: 'tire_size', label: 'Medida', placeholder: 'Ex: 225/70 R19.5' },
      { key: 'tire_qty', label: 'Quantidade de pneus', type: 'number', step: '1', placeholder: 'Ex: 4' },
      { key: 'alignment', label: 'Alinhamento / balanceamento', type: 'select', options: ['Não', 'Sim'] },
      { key: 'shop', label: 'Oficina / responsável', placeholder: 'Quem executou' },
    ],
  },
  peca: {
    label: 'Troca de peças',
    color: 'var(--violet)',
    defaultName: '',
    nameLabel: 'Peça trocada',
    namePlaceholder: 'Ex: Bomba d’água',
    fields: [
      { key: 'part_number', label: 'Número da peça', placeholder: 'Part number / SKU' },
      { key: 'brand', label: 'Marca', placeholder: 'Ex: Bosch' },
      { key: 'supplier', label: 'Onde comprou', placeholder: 'Ex: AutoZone' },
      { key: 'warranty', label: 'Garantia', placeholder: 'Ex: 12 meses' },
      { key: 'shop', label: 'Oficina / responsável', placeholder: 'Quem executou' },
    ],
  },
  revisao: {
    label: 'Revisão / inspeção',
    color: 'var(--ok)',
    defaultName: 'Revisão',
    fields: [
      { key: 'checklist', label: 'O que foi revisado', placeholder: 'Ex: freios, suspensão, luzes' },
      { key: 'result', label: 'Resultado', type: 'select', options: ['Aprovado', 'Aprovado com ressalva', 'Reprovado'] },
      { key: 'next_date', label: 'Próxima inspeção', type: 'date' },
      { key: 'shop', label: 'Oficina / responsável', placeholder: 'Quem executou' },
    ],
  },
  outro: {
    label: 'Outro serviço',
    color: 'var(--text-secondary)',
    defaultName: '',
    nameLabel: 'Serviço',
    namePlaceholder: 'Ex: Funilaria',
    fields: [
      { key: 'shop', label: 'Oficina / responsável', placeholder: 'Quem executou' },
    ],
  },
};

export function maintenanceType(type) {
  return MAINTENANCE_TYPES[type] || MAINTENANCE_TYPES.peca;
}

/**
 * Situação de uma ordem de manutenção.
 * Registros antigos (sem `status`) contam como concluídos.
 */
export const WORK_STATUS = {
  em_andamento: { value: 'em_andamento', label: 'Em manutenção', color: 'var(--warn)', bg: 'var(--warn-soft)' },
  concluido: { value: 'concluido', label: 'Pronto', color: 'var(--ok)', bg: 'var(--ok-soft)' },
};

export function workStatus(entry) {
  return WORK_STATUS[entry?.status] || WORK_STATUS.concluido;
}

export function isOpenWork(entry) {
  return entry?.status === 'em_andamento';
}

/** Texto do serviço para listas: campo aberto quando existe, senão o resumo. */
export function workSummary(entry) {
  return (entry?.work_done || '').trim() || entry?.part_name || maintenanceType(entry?.type).label;
}

/** Transforma os campos específicos num resumo legível para a tabela. */
export function describeDetails(type, details) {
  if (!details) return '';
  const config = maintenanceType(type);
  return config.fields
    .map(({ key, label }) => {
      const v = details[key];
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
      return `${label}: ${Array.isArray(v) ? v.join(', ') : v}`;
    })
    .filter(Boolean)
    .join(' · ');
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
