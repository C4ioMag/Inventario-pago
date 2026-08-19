import { matchTeamId, splitTeamLabel, teamIndex, teamKey } from './teams';

/**
 * Leitura de planilhas — dicionário de colunas, detecção do cabeçalho e
 * conversão de células.
 *
 * A regra é simples: nada do arquivo pode se perder. Colunas conhecidas viram
 * campos do equipamento/item; as desconhecidas são preservadas em "Observações"
 * no formato `Coluna: valor`.
 */

/** Normaliza texto para comparar cabeçalhos: sem acento, sem espaço, sem pontuação. */
export function normKey(v) {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Texto legível de uma célula do exceljs (fórmula, link, rich text, data...). */
export function cellText(value) {
  if (value == null) return '';
  if (value instanceof Date) return toISODate(value);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('');
    if (value.text != null) return String(value.text);
    if (value.hyperlink) return String(value.hyperlink);
    if (value.result != null) return cellText(value.result);
    if (value.formula != null) return '';
    if (value.error) return '';
    return '';
  }
  return String(value);
}

export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Aceita "5.000", "5,000", "$ 1.234,56", "12 mi" e devolve número ou null. */
export function toNumber(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (lastComma > -1 && lastDot > -1) {
    // o separador decimal é o que aparece por último
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (lastComma > -1) {
    // "1,5" é decimal; "1,500" com 3 casas é milhar
    normalized = /,\d{3}$/.test(cleaned) ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  } else if (lastDot > -1 && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // "3.500" / "1.234.567" no padrão brasileiro é milhar, não decimal
    normalized = cleaned.replace(/\./g, '');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Datas de planilha vêm como Date, "12/31/2024", "31/12/2024" ou "2024-12-31". */
export function toDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (br) {
    let [, a, b, y] = br;
    if (y.length === 2) y = `20${y}`;
    // dia > 12 só pode ser dia; senão assume o padrão americano (mês primeiro)
    const [dd, mm] = Number(a) > 12 ? [a, b] : [b, a];
    return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : toISODate(parsed);
}

const STATUS_ALIASES = {
  disponivel: ['disponivel', 'available', 'ok', 'ativo', 'active', 'livre', 'ready', 'pronto'],
  em_uso: ['emuso', 'inuse', 'uso', 'working', 'trabalhando', 'alocado', 'assigned'],
  manutencao: ['manutencao', 'maintenance', 'shop', 'oficina', 'reparo', 'repair', 'parado', 'down', 'outofservice'],
};

const YES = ['sim', 's', 'yes', 'y', 'true', 'ok', 'x', 'tem', 'possui', 'ativo', 'instalado', 'ativa', '1'];
const NO = ['nao', 'n', 'no', 'false', 'sem', 'nenhum', 'naotem', 'naopossui', '0', '-'];

/**
 * Campos que são só "tem ou não tem" (ex.: o GPS Samsung).
 * Qualquer conteúdo diferente de um "não" explícito conta como "Sim" — numa
 * planilha, um número de série preenchido significa que o aparelho existe.
 */
export function toYesNo(raw) {
  const key = normKey(raw);
  if (!key) return null;
  if (NO.includes(key)) return 'Não';
  if (YES.includes(key)) return 'Sim';
  return 'Sim';
}

export function toStatus(raw) {
  const key = normKey(raw);
  if (!key) return null;
  for (const [status, aliases] of Object.entries(STATUS_ALIASES)) {
    if (aliases.some((a) => key === a || key.includes(a))) return status;
  }
  return null;
}

/** Campos de uma lista de equipes. */
export const TEAM_FIELDS = [
  { key: 'name', label: 'Equipe', aliases: ['equipe', 'team', 'crew', 'turma', 'nome', 'name', 'grupo', 'squad'] },
  { key: 'code', label: 'Código', aliases: ['codigo', 'code', 'sigla', 'numero', 'number', 'id', 'teamcode', 'crewcode'] },
  { key: 'supervisor', label: 'Supervisor', aliases: ['supervisor', 'responsavel', 'lider', 'leader', 'foreman', 'encarregado'] },
  { key: 'kind', label: 'Tipo (equipe/supervisor)', aliases: ['tipo', 'type', 'funcao', 'kind', 'classe', 'categoria', 'cargo'] },
];

/** "Supervisor" e "Equipe" são os dois tipos de grupo que guardam equipamento. */
export function toTeamKind(raw) {
  const key = normKey(raw);
  if (!key) return null;
  return key.includes('superv') || key.includes('encarregado') || key.includes('lider') ? 'supervisor' : 'equipe';
}

/**
 * Campos de equipamento reconhecidos.
 * `aliases` são comparados normalizados; `loose` permite casar por "contém"
 * (ex.: cabeçalho "VIN NUMBER (17)" casa com o alias "vin").
 */
export const ASSET_FIELDS = [
  { key: 'name', label: 'Nome / Código', aliases: ['codigo', 'code', 'nome', 'name', 'equipamento', 'equipment', 'asset', 'assetname', 'unit', 'unitnumber', 'unitno', 'veiculo', 'vehicle', 'truck', 'truckno', 'numero', 'number'] },
  { key: 'tipo', label: 'Categoria', aliases: ['tipo', 'type', 'categoria', 'category', 'classe', 'class', 'familia', 'equipmenttype', 'assettype'] },
  { key: 'model', label: 'Modelo', aliases: ['modelo', 'model', 'marca', 'make', 'makemodel', 'marcamodelo', 'modelmake', 'fabricante', 'manufacturer', 'brand'] },
  { key: 'year', label: 'Ano', aliases: ['ano', 'year', 'anofabricacao', 'modelyear', 'yr'] },
  { key: 'plate', label: 'Placa', aliases: ['placa', 'plate', 'licenseplate', 'license', 'tag', 'tagnumber', 'tagno', 'plateno', 'platenumber'] },
  { key: 'vin', label: 'VIN', aliases: ['vin', 'chassi', 'chassis', 'serial', 'numerodeserie', 'numeroserie'], loose: true },
  { key: 'team', label: 'Equipe', aliases: ['equipe', 'team', 'crew', 'turma', 'setor', 'squad', 'grupo', 'location', 'local', 'base', 'yard'] },
  { key: 'supervisor', label: 'Supervisor', aliases: ['supervisor', 'responsavel', 'driver', 'motorista', 'operador', 'operator', 'foreman', 'lider', 'leader'] },
  { key: 'owner', label: 'Proprietário', aliases: ['proprietario', 'owner', 'empresa', 'company', 'titular', 'ownership', 'leasing', 'lease'] },
  { key: 'status', label: 'Status', aliases: ['status', 'situacao', 'condicao', 'condition', 'state', 'disponibilidade'] },
  { key: 'odometer', label: 'Odômetro', aliases: ['odometro', 'odometer', 'milhagem', 'mileage', 'miles', 'km', 'quilometragem', 'hodometro', 'horimetro', 'hourmeter', 'hours', 'horas', 'enginehours'], loose: true },
  { key: 'oil_interval', label: 'Intervalo de troca de óleo', aliases: ['intervalo', 'intervalotroca', 'intervalodeoleo', 'oilinterval', 'trocaacada', 'oilchangeinterval', 'servicoacada'] },
  { key: 'last_oil_odometer', label: 'Odômetro da última troca', aliases: ['odometroultimatroca', 'ultimatrocaodometro', 'lastoilodometer', 'lastoilmileage', 'lastservicemileage', 'ultimatrocamilhagem'] },
  { key: 'last_oil_date', label: 'Data da última troca', aliases: ['dataultimatroca', 'ultimatrocaoleo', 'ultimatroca', 'lastoilchange', 'lastoildate', 'dataoleo', 'lastservicedate', 'lastservice'] },
  { key: 'verizon', label: 'Verizon', aliases: ['verizon'], loose: true },
  { key: 'bouncie', label: 'Bouncie', aliases: ['bouncie', 'bounce', 'bouncy'], loose: true },
  { key: 'samsung', label: 'Samsung (GPS)', aliases: ['samsung', 'gps', 'rastreador', 'tracker'], loose: true, yesNo: true },
  { key: 'e_pass', label: 'E-ZPass', aliases: ['ezpass', 'epass', 'pedagio', 'toll', 'transponder', 'sunpass'], loose: true },
  { key: 'notes', label: 'Observações', aliases: ['observacao', 'observacoes', 'notes', 'note', 'obs', 'comentario', 'comentarios', 'comments', 'descricao', 'description', 'remarks', 'detalhes'] },
];

export const ITEM_FIELDS = [
  { key: 'name', label: 'Item', aliases: ['item', 'nome', 'name', 'produto', 'product', 'descricao', 'description', 'peca', 'part', 'partname', 'material'] },
  { key: 'quantity', label: 'Quantidade', aliases: ['quantidade', 'qtd', 'qtde', 'quantity', 'qty', 'estoque', 'stock', 'saldo', 'onhand'] },
  { key: 'unitPrice', label: 'Preço unitário', aliases: ['preco', 'precounitario', 'valor', 'valorunitario', 'price', 'unitprice', 'custo', 'cost', 'unitcost'] },
  { key: 'minQuantity', label: 'Estoque mínimo', aliases: ['minimo', 'estoqueminimo', 'min', 'minqty', 'minimum', 'reorderpoint', 'pontodepedido'] },
  { key: 'team', label: 'Equipe', aliases: ['equipe', 'team', 'crew', 'turma', 'setor', 'local', 'location'] },
  { key: 'notes', label: 'Observações', aliases: ['observacao', 'observacoes', 'notes', 'obs', 'comentario', 'comments', 'remarks'] },
];

/**
 * Casa os cabeçalhos com os campos conhecidos.
 * Primeiro exige igualdade exata; depois aceita "contém" nos campos `loose`.
 * Devolve `{ cols, matched, extras }` — `extras` são os índices não reconhecidos.
 */
export function matchColumns(headers, fields, { overrides = {}, ignore = [] } = {}) {
  const keys = headers.map(normKey);
  const cols = {};
  const taken = new Set();
  const ignored = new Set(ignore.map(Number));

  // O que o usuário escolher na tela manda mais que o reconhecimento automático
  for (const [field, index] of Object.entries(overrides)) {
    if (index == null || index === '') continue;
    cols[field] = Number(index);
    taken.add(Number(index));
  }
  for (const index of ignored) taken.add(index);

  for (const field of fields) {
    if (cols[field.key] != null) continue;
    const idx = keys.findIndex((k, i) => k && !taken.has(i) && field.aliases.includes(k));
    if (idx !== -1) {
      cols[field.key] = idx;
      taken.add(idx);
    }
  }
  // Campos `loose` escolhem primeiro: "NUMERO DE SERIE" é VIN, não o nome,
  // mesmo que "numero" também seja apelido de nome.
  const claim = (field, test) => {
    if (cols[field.key] != null) return;
    const idx = keys.findIndex((k, i) => k && !taken.has(i) && field.aliases.some((a) => a.length >= 3 && test(k, a)));
    if (idx !== -1) {
      cols[field.key] = idx;
      taken.add(idx);
    }
  };
  for (const field of fields.filter((f) => f.loose)) claim(field, (k, a) => k.includes(a));
  for (const field of fields) claim(field, (k, a) => k.startsWith(a));

  // Sobrou: vira observação — menos o que o usuário mandou ignorar
  const extras = headers.map((_, i) => i).filter((i) => !taken.has(i) && !ignored.has(i) && keys[i]);
  return { cols, matched: Object.keys(cols), extras };
}

/**
 * Descobre qual linha é o cabeçalho.
 * Planilhas reais costumam ter título, logo ou linhas em branco antes —
 * pegamos a linha das primeiras 20 que reconhece mais colunas.
 */
export function detectHeaderRow(rows, fields, limit = 20) {
  let best = { index: 0, score: -1 };
  const max = Math.min(rows.length, limit);
  for (let i = 0; i < max; i++) {
    const row = rows[i] || [];
    const filled = row.filter((c) => String(c ?? '').trim()).length;
    if (filled < 2) continue;
    const { cols } = matchColumns(row.map(cellText), fields);
    const score = Object.keys(cols).length * 2 + (cols.name != null ? 3 : 0);
    if (score > best.score) best = { index: i, score };
  }
  return best.score <= 0 ? 0 : best.index;
}

/** Junta as colunas não reconhecidas num texto `Coluna: valor` por linha. */
function extrasText(headers, row, extras) {
  return extras
    .map((i) => {
      const value = cellText(row[i]).trim();
      const label = String(headers[i] ?? '').trim();
      return value && label ? `${label}: ${value}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}

/**
 * Uma linha com uma única célula preenchida no meio da lista costuma ser um
 * cabeçalho de grupo ("EQUIPE CAIO — PC-038"): os equipamentos abaixo dela
 * pertencem a essa equipe. Só vale quando a planilha não tem coluna de equipe.
 */
function groupHeaderTeam(row) {
  const filled = row.map(cellText).map((v) => v.trim()).filter(Boolean);
  if (filled.length !== 1) return null;
  const text = filled[0];
  if (text.length > 60) return null;
  if (/^(equipe|team|crew|turma)\b/i.test(text)) return text;
  return null;
}

/** Converte a matriz da planilha em equipamentos prontos para o banco. */
export function buildAssetRows({ headers, data, teams = [], mapping }) {
  const index = teamIndex(teams);
  const { cols, extras } = matchColumns(headers, ASSET_FIELDS, mapping);
  if (cols.name == null) {
    return {
      error: 'Não achei a coluna com o nome/código do equipamento. Renomeie a coluna para "Nome", "Código", "Unit" ou "Equipamento".',
      list: [],
      cols,
      extras: [],
    };
  }

  const list = [];
  const groups = new Set();
  let currentGroup = null;

  for (const row of data) {
    const get = (f) => (cols[f] == null ? '' : cellText(row[cols[f]]).trim());

    if (cols.team == null) {
      const header = groupHeaderTeam(row);
      if (header) {
        currentGroup = header;
        groups.add(header);
        continue;
      }
    }

    const name = get('name');
    if (!name) continue;

    const teamText = get('team') || currentGroup || '';
    const extra = extrasText(headers, row, extras);
    const notes = [get('notes'), extra].filter(Boolean).join(' · ') || null;

    list.push({
      name,
      tipo: get('tipo') || null,
      model: get('model') || null,
      year: get('year') || null,
      plate: get('plate') || null,
      vin: get('vin').toUpperCase() || null,
      supervisor: get('supervisor') || null,
      owner: get('owner') || null,
      status: toStatus(get('status')) || 'disponivel',
      odometer: toNumber(get('odometer')),
      oil_interval: toNumber(get('oil_interval')),
      last_oil_odometer: toNumber(get('last_oil_odometer')),
      last_oil_date: toDate(get('last_oil_date')),
      verizon: get('verizon') || null,
      bouncie: get('bouncie') || null,
      samsung: toYesNo(get('samsung')),
      e_pass: get('e_pass') || null,
      notes,
      team_id: matchTeamId(teamText, index),
      team_label: teamText || null,
    });
  }

  return {
    list,
    cols,
    groups: [...groups],
    extras: extras.map((i) => String(headers[i] ?? '').trim()).filter(Boolean),
  };
}

/** Converte a matriz em equipes (nome, código e supervisor). */
export function buildTeamRows({ headers, data, mapping }) {
  const { cols, extras } = matchColumns(headers, TEAM_FIELDS, mapping);
  if (cols.name == null) {
    return { error: 'Não achei a coluna com o nome da equipe. Renomeie a coluna para "Equipe", "Nome" ou "Crew".', list: [], cols, extras: [] };
  }

  const seen = new Set();
  const list = [];
  for (const row of data) {
    const get = (f) => (cols[f] == null ? '' : cellText(row[cols[f]]).trim());
    const raw = get('name');
    if (!raw) continue;
    // Sem coluna de código, "Equipe Caio, PC-038" numa coluna só já vira nome + código
    const split = splitTeamLabel(raw);
    const hasCodeColumn = cols.code != null && get('code');
    const name = (hasCodeColumn ? raw.replace(/^\s*(equipe|team|crew|turma)\s*[:\-–]?\s*/i, '').trim() : split.name) || raw;
    const code = get('code') || (hasCodeColumn ? null : split.code) || null;
    const key = teamKey(`${name}${code || ''}`);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ name, code, supervisor: get('supervisor') || null, kind: toTeamKind(get('kind')) });
  }

  return { list, cols, extras: extras.map((i) => String(headers[i] ?? '').trim()).filter(Boolean) };
}

/** Converte a matriz da planilha em itens de estoque. */
export function buildItemRows({ headers, data, teams = [], mapping }) {
  const index = teamIndex(teams);
  const { cols, extras } = matchColumns(headers, ITEM_FIELDS, mapping);
  if (cols.name == null) {
    return {
      error: 'Não achei a coluna com o nome do item. Renomeie a coluna para "Item", "Nome" ou "Descrição".',
      list: [],
      cols,
      extras: [],
    };
  }

  const list = [];
  for (const row of data) {
    const get = (f) => (cols[f] == null ? '' : cellText(row[cols[f]]).trim());
    const name = get('name');
    if (!name) continue;
    list.push({
      name,
      quantity: toNumber(get('quantity')) ?? 0,
      unitPrice: toNumber(get('unitPrice')) ?? 0,
      minQuantity: toNumber(get('minQuantity')) ?? 0,
      teamId: matchTeamId(get('team'), index),
      team_label: get('team') || null,
    });
  }

  return { list, cols, extras: extras.map((i) => String(headers[i] ?? '').trim()).filter(Boolean) };
}

/** Colunas de uma planilha viram linhas: usado para mostrar o que foi lido. */
export function fieldLabel(fields, key) {
  return fields.find((f) => f.key === key)?.label || key;
}
