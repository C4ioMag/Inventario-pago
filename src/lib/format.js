export function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

export function fmtDate(d) {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString('pt-BR');
}

export function fmtDateTime(d) {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleString('pt-BR');
}

/**
 * Campos "tem ou não tem" (ex.: o GPS Samsung) guardados como texto.
 * Cadastros antigos guardavam o número do aparelho — ter número é ter o GPS.
 */
export function yesNo(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return '';
  return ['nao', 'não', 'no', 'n', 'false', '0', '-'].includes(v) ? 'Não' : 'Sim';
}

export function genId() {
  return crypto.randomUUID();
}
