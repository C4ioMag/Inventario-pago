/**
 * Leitura de PDFs no navegador.
 *
 * O PDF é lido página a página com o pdf.js e o texto extraído passa por
 * heurísticas que reconhecem VIN, placa, ano, odômetro etc. O usuário confirma
 * o que foi encontrado antes de gravar — nada é escrito automaticamente.
 */

let pdfjsPromise = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Abre o PDF e devolve as linhas de cada página já reconstruídas.
 *
 * O pdf.js assume a posse do buffer que recebe, então cada leitura usa uma
 * cópia — assim o mesmo arquivo pode ser lido de novo pelo chamador.
 */
async function readLines(source) {
  const pdfjs = await loadPdfjs();
  const bytes = typeof source === 'string' ? dataUrlToBytes(source) : new Uint8Array(source);
  const doc = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;

  const lines = [];   // { page, y, parts: [{ x, str }] }
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const byY = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      // arredonda a altura: trechos da mesma linha raramente batem no pixel
      const y = Math.round(item.transform[5] / 3) * 3;
      const parts = byY.get(y) || [];
      parts.push({ x: item.transform[4], width: item.width || item.str.length * 4, str: item.str.trim() });
      byY.set(y, parts);
    }
    for (const [y, parts] of byY) {
      lines.push({ page: n, y, parts: parts.sort((a, b) => a.x - b.x) });
    }
  }
  await doc.destroy();

  lines.sort((a, b) => a.page - b.page || b.y - a.y);
  return { lines, pageCount: Math.max(1, lines.reduce((m, l) => Math.max(m, l.page), 0)) };
}

/** Texto corrido por página, na ordem de leitura. */
function linesToPages(lines, pageCount) {
  const pages = Array.from({ length: pageCount }, () => []);
  for (const line of lines) {
    pages[line.page - 1].push(line.parts.map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim());
  }
  return pages.map((rows) => rows.filter(Boolean).join('\n'));
}

/**
 * Lê o PDF de uma vez só e devolve as duas visões do mesmo arquivo:
 * o texto (para documentos de um veículo) e a tabela (para listas).
 */
export async function readPdf(source) {
  const { lines, pageCount } = await readLines(source);
  const pages = linesToPages(lines, pageCount);
  return { pages, text: pages.join('\n\n'), rows: rowsFromLines(lines) };
}

/** Texto de todas as páginas. Devolve `{ pages: string[], text }`. */
export async function extractPdfText(source) {
  const { pages, text } = await readPdf(source);
  return { pages, text };
}

/**
 * Lê o PDF como tabela: cada linha vira um array de células.
 * Listas de frota e de equipes exportadas em PDF não têm tabela de verdade
 * dentro do arquivo — as colunas são deduzidas das posições horizontais.
 */
export async function extractPdfRows(source) {
  const { rows } = await readPdf(source);
  return { rows, columns: rows.reduce((m, r) => Math.max(m, r.length), 0) };
}

/**
 * Corta as linhas em células usando as faixas verticais que ficam em branco
 * no documento inteiro. É assim que se enxerga a coluna de um PDF: não existe
 * tabela dentro do arquivo, só texto posicionado — o que separa uma coluna da
 * outra é o corredor de espaço que nenhuma linha ocupa.
 */
export function rowsFromLines(lines) {
  const boundaries = columnBoundaries(lines);
  return lines.map((line) => {
    const cells = new Array(boundaries.length + 1).fill('');
    for (const part of line.parts) {
      let col = 0;
      // a célula é escolhida pelo início do trecho
      while (col < boundaries.length && part.x >= boundaries[col]) col++;
      cells[col] = cells[col] ? `${cells[col]} ${part.str}` : part.str;
    }
    return cells.map((c) => c.trim());
  }).filter((cells) => cells.some(Boolean));
}

/** Quantos blocos de texto separados a linha tem (palavras coladas contam como um). */
function blockCount(line) {
  let blocks = 0;
  let end = -Infinity;
  for (const part of line.parts) {
    if (part.x - end > MIN_GAP) blocks++;
    end = Math.max(end, part.x + Math.max(part.width, 1));
  }
  return blocks;
}

const BIN = 2;              // resolução da varredura horizontal, em pontos
const MIN_GAP = 6;          // corredor menor que isso é espaço entre palavras
const MAX_COLUMNS = 24;

export function columnBoundaries(lines) {
  if (lines.length < 3) return [];

  // Títulos e cabeçalhos de grupo são uma faixa de texto só e atravessam
  // várias colunas — se contassem, fechariam os corredores das linhas reais.
  const tableLines = lines.filter((line) => blockCount(line) >= 2);
  if (tableLines.length < 2) return [];

  // Quantas linhas ocupam cada faixa horizontal do documento
  const occupancy = new Map();
  let maxBin = 0;
  for (const line of tableLines) {
    const bins = new Set();
    for (const part of line.parts) {
      const from = Math.floor(part.x / BIN);
      const to = Math.ceil((part.x + Math.max(part.width, 1)) / BIN);
      for (let b = from; b < to; b++) bins.add(b);
      if (to > maxBin) maxBin = to;
    }
    for (const b of bins) occupancy.set(b, (occupancy.get(b) || 0) + 1);
  }

  // Uma linha desalinhada isolada não deve fechar um corredor sozinha
  const noise = tableLines.length >= 8 ? 1 : 0;
  const firstUsed = Math.min(...occupancy.keys());

  const boundaries = [];
  let gapStart = null;
  for (let b = firstUsed; b <= maxBin; b++) {
    const busy = (occupancy.get(b) || 0) > noise;
    if (!busy) {
      if (gapStart == null) gapStart = b;
      continue;
    }
    if (gapStart != null) {
      const gapWidth = (b - gapStart) * BIN;
      // a divisa fica no fim do corredor, onde a próxima coluna começa
      if (gapWidth >= MIN_GAP) boundaries.push(b * BIN);
      gapStart = null;
    }
  }

  return boundaries.slice(0, MAX_COLUMNS);
}

const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/g;

/** VIN válido tem 17 caracteres, sem I/O/Q e nunca é só dígitos. */
function findVins(text) {
  const found = new Set();
  for (const m of String(text).toUpperCase().matchAll(VIN_RE)) {
    const vin = m[0];
    if (/^\d+$/.test(vin)) continue;
    if (!/\d/.test(vin)) continue;
    found.add(vin);
  }
  return [...found];
}

/**
 * Limpa o valor achado depois de um rótulo: tira "No:", "#", separadores e
 * corta quando um novo rótulo começa na mesma linha
 * ("Plate No: DY69VH Expires: 12/31/2026" → "DY69VH").
 */
function cleanValue(raw) {
  let v = String(raw).trim();
  v = v.replace(/^(?:n[oº°.]?|number|num|nro|no\.)\b\s*/i, '');
  v = v.replace(/^[\s:;#.\-–—]+/, '');
  const next = v.search(/\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ./]{2,}\s*:/);
  if (next > 0) v = v.slice(0, next);
  return v.trim().replace(/[.,;]$/, '');
}

/** Procura `rótulo: valor` na mesma linha ou na linha seguinte. */
function labelled(text, labels) {
  const lines = String(text).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const label of labels) {
      const re = new RegExp(`${label}\\s*[:#-]?\\s*(.+)`, 'i');
      const m = line.match(re);
      if (m) {
        const value = cleanValue(m[1].split(/\s{2,}/)[0]);
        if (value) return value;
      }
      if (new RegExp(`^\\s*${label}\\s*[:#]?\\s*$`, 'i').test(line) && lines[i + 1]) {
        const next = cleanValue(lines[i + 1]);
        if (next) return next;
      }
    }
  }
  return null;
}

/**
 * Campos que dá para reconhecer num documento de veículo
 * (registration, título, inspeção DOT, apólice, nota de serviço).
 */
export function extractVehicleFields(text) {
  const vins = findVins(text);
  // VIN escrito com espaços ("1HTM MAAL 57H5 42831") não casa com a busca solta
  const labelledVin = labelled(text, ['vin number', 'vin', 'chassi', 'chassis', 'numero de serie']);
  const cleanedVin = labelledVin ? labelledVin.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : null;
  if (cleanedVin && cleanedVin.length === 17 && !vins.includes(cleanedVin)) vins.unshift(cleanedVin);
  const yearMatch = labelled(text, ['ano', 'year', 'model year', 'yr']);
  const year = (yearMatch && yearMatch.match(/(19|20)\d{2}/)?.[0])
    || text.match(/\b(19[89]\d|20[0-4]\d)\b/)?.[0]
    || null;

  const odometerRaw = labelled(text, ['odometer', 'odometro', 'odômetro', 'mileage', 'milhagem', 'miles', 'hour meter', 'hourmeter', 'horimetro']);
  const odometer = odometerRaw ? Number(String(odometerRaw).replace(/[^\d]/g, '')) || null : null;

  const samsung = labelled(text, ['samsung', 'gps', 'rastreador', 'tracker']);

  return {
    vin: vins[0] || null,
    allVins: vins,
    name: labelled(text, ['unit', 'unidade', 'equipamento', 'codigo', 'código', 'truck', 'veiculo', 'veículo', 'asset']),
    plate: labelled(text, ['placa', 'plate', 'license plate', 'plate no', 'tag']),
    year,
    model: labelled(text, ['modelo', 'model', 'make/model', 'make']),
    owner: labelled(text, ['owner', 'proprietario', 'proprietário', 'registered owner', 'titular']),
    supervisor: labelled(text, ['supervisor', 'responsavel', 'responsável', 'driver', 'motorista']),
    team: labelled(text, ['equipe', 'team', 'crew']),
    verizon: labelled(text, ['verizon', 'verizon connect']),
    bouncie: labelled(text, ['bouncie', 'bounce']),
    samsung: samsung ? toYesNoText(samsung) : null,
    e_pass: labelled(text, ['e-zpass', 'ezpass', 'e z pass', 'epass', 'sunpass', 'pedagio', 'pedágio', 'toll', 'transponder']),
    expires: labelled(text, ['expira', 'expires', 'expiration', 'valid until', 'validade']),
    policy: labelled(text, ['policy', 'apolice', 'apólice', 'policy number']),
    odometer,
  };
}

/** No documento, o Samsung é só "tem ou não tem" GPS. */
function toYesNoText(raw) {
  const v = String(raw).trim().toLowerCase();
  return ['nao', 'não', 'no', 'n', 'false', '0', '-', 'sem'].includes(v) ? 'Não' : 'Sim';
}

/** Campos preenchidos, prontos para listar na tela. */
export const PDF_FIELD_LABELS = {
  name: 'Unidade / código',
  vin: 'VIN',
  plate: 'Placa',
  year: 'Ano',
  model: 'Modelo / Marca',
  owner: 'Proprietário',
  supervisor: 'Supervisor',
  team: 'Equipe',
  odometer: 'Odômetro',
  verizon: 'Verizon',
  bouncie: 'Bouncie',
  samsung: 'Samsung (GPS)',
  e_pass: 'E-ZPass',
  expires: 'Validade',
  policy: 'Apólice / documento',
};
