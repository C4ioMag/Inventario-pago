/**
 * Equipes têm nome e, opcionalmente, um código do sistema (ex.: "PC-038").
 * Este arquivo centraliza como esse par é escrito e comparado.
 */

/** "Caio · PC-038" — ou só o nome, quando não há código. */
export function teamLabel(team) {
  if (!team) return '';
  const name = (team.name || '').trim();
  const code = (team.code || '').trim();
  return code ? `${name} · ${code}` : name;
}

/**
 * Chave de comparação de equipe vinda de planilha/PDF.
 * Ignora acento, pontuação e os prefixos "equipe", "team" e "crew" —
 * assim "Equipe Caio", "EQUIPE CAIO" e "Caio" caem na mesma chave.
 */
export function teamKey(value) {
  const base = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  // "Equipe Caio" e "Caio" são a mesma equipe — mas "Crew 12" continua "Crew 12",
  // porque tirar o prefixo deixaria só um número.
  const stripped = base.replace(/^\s*(equipe|team|crew|turma)\s*[:\-–]?\s*/, '');
  const useStripped = stripped && !/^\d+$/.test(stripped.trim());
  return (useStripped ? stripped : base).replace(/[^a-z0-9]/g, '');
}

/**
 * Procura a equipe correspondente a um texto solto da planilha/PDF.
 * Tenta o texto inteiro e, se não achar, o nome e o código separados —
 * assim "PC-038 - Caio" encontra a equipe cadastrada como "Caio · PC-038".
 */
export function matchTeamId(value, index) {
  const whole = teamKey(value);
  if (!whole) return null;
  if (index.has(whole)) return index.get(whole);
  const { name, code } = splitTeamLabel(value);
  for (const part of [code, name]) {
    const key = teamKey(part);
    if (key && index.has(key)) return index.get(key);
  }
  return null;
}

/** Índice nome→id e código→id, usado nas importações. */
export function teamIndex(teams) {
  const map = new Map();
  for (const t of teams) {
    if (t.name) map.set(teamKey(t.name), t.id);
    if (t.code) map.set(teamKey(t.code), t.id);
    if (t.name && t.code) map.set(teamKey(`${t.name} ${t.code}`), t.id);
  }
  return map;
}

/**
 * Separa "Caio PC-038", "PC-038 - Caio" ou "Equipe Caio (PC-038)"
 * em `{ name, code }`. O código é um bloco tipo PC-038 / A12 / 038.
 */
const CODE_RE = /\b([A-Za-z]{1,4}[-\s]?\d{2,5}|\d{3,5})\b/;

export function splitTeamLabel(raw) {
  const original = String(raw ?? '').trim();
  const withoutPrefix = original.replace(/^\s*(equipe|team|crew|turma)\s*[:\-–]?\s*/i, '');
  const clean = withoutPrefix && !/^\d+$/.test(withoutPrefix) ? withoutPrefix : original;
  if (!clean) return { name: '', code: null };
  const m = clean.match(CODE_RE);
  if (!m) return { name: clean, code: null };
  const code = m[1].replace(/\s+/g, '-').toUpperCase();
  // O nome é o que vem antes do código ("Equipe Caio, PC-038 Felipe Donato" → "Caio");
  // se nada vier antes, usa o que vem depois ("PC-038 - Caio" → "Caio").
  const tidy = (v) => v.replace(/[()\-–—·,;:|]/g, ' ').replace(/\s+/g, ' ').trim();
  const before = tidy(clean.slice(0, m.index));
  const after = tidy(clean.slice(m.index + m[0].length));
  return { name: before || after || code, code };
}
