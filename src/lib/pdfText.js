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

/** Texto de todas as páginas. Devolve `{ pages: string[], text }`. */
export async function extractPdfText(source) {
  const pdfjs = await loadPdfjs();
  const data = typeof source === 'string' ? dataUrlToBytes(source) : new Uint8Array(source);
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // Reconstrói as linhas pela posição vertical de cada trecho
    const lines = new Map();
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      const line = lines.get(y) || [];
      line.push({ x: item.transform[4], str: item.str });
      lines.set(y, line);
    }
    const text = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
    pages.push(text);
  }
  await doc.destroy();

  return { pages, text: pages.join('\n\n') };
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
  const yearMatch = labelled(text, ['ano', 'year', 'model year', 'yr']);
  const year = (yearMatch && yearMatch.match(/(19|20)\d{2}/)?.[0])
    || text.match(/\b(19[89]\d|20[0-4]\d)\b/)?.[0]
    || null;

  const odometerRaw = labelled(text, ['odometer', 'odometro', 'odômetro', 'mileage', 'milhagem', 'miles', 'hour meter', 'hourmeter', 'horimetro']);
  const odometer = odometerRaw ? Number(String(odometerRaw).replace(/[^\d]/g, '')) || null : null;

  return {
    vin: vins[0] || null,
    allVins: vins,
    plate: labelled(text, ['placa', 'plate', 'license plate', 'plate no', 'tag']),
    year,
    model: labelled(text, ['modelo', 'model', 'make/model', 'make']),
    owner: labelled(text, ['owner', 'proprietario', 'proprietário', 'registered owner', 'titular']),
    expires: labelled(text, ['expira', 'expires', 'expiration', 'valid until', 'validade']),
    policy: labelled(text, ['policy', 'apolice', 'apólice', 'policy number']),
    odometer,
  };
}

/** Campos preenchidos, prontos para listar na tela. */
export const PDF_FIELD_LABELS = {
  vin: 'VIN',
  plate: 'Placa',
  year: 'Ano',
  model: 'Modelo / Marca',
  owner: 'Proprietário',
  expires: 'Validade',
  policy: 'Apólice / documento',
  odometer: 'Odômetro',
};
