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

export function genId() {
  return crypto.randomUUID();
}
