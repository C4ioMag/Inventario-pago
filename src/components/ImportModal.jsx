import { useEffect, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, FileText, Upload } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import {
  ASSET_FIELDS, ITEM_FIELDS, buildAssetRows, buildItemRows,
  cellText, detectHeaderRow, fieldLabel, normKey,
} from '../lib/importMap';
import { PDF_FIELD_LABELS, extractPdfText, extractVehicleFields } from '../lib/pdfText';

const PDF_RE = /\.pdf$/i;

/** CSV/TSV com aspas, ponto-e-vírgula ou tabulação. */
function parseDelimited(text) {
  const sample = text.slice(0, 5000);
  const counts = [[',', 0], [';', 0], ['\t', 0]].map(([d]) => [d, (sample.match(new RegExp(`\\${d}`, 'g')) || []).length]);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === delim) { row.push(cell); cell = ''; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (c === '\r') continue;
    cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim()));
}

export default function ImportModal({ open, document: doc, onClose }) {
  const { teams, assets, importAssets, importItems, addDocument, updateAsset, ensureAssetByName } = useData();
  const { notify } = useToast();
  const inputRef = useRef(null);

  const [mode, setMode] = useState('assets');
  const [file, setFile] = useState(null);          // { name }
  const [sheets, setSheets] = useState([]);        // [{ name, rows }]
  const [sheetIdx, setSheetIdx] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [headerAuto, setHeaderAuto] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [pdf, setPdf] = useState(null);            // { text, fields, pages }
  const [pdfTarget, setPdfTarget] = useState('');
  const [showText, setShowText] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  function reset() {
    setFile(null);
    setSheets([]);
    setSheetIdx(0);
    setHeaderRow(0);
    setHeaderAuto(true);
    setPdf(null);
    setPdfTarget('');
    setShowText(false);
    setResult(null);
  }

  useEffect(() => {
    if (!open) return;
    reset();
    setMode('assets');
    if (doc?.data) parseDataUrl(doc.data, doc.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc]);

  async function parseBuffer(buffer, fileName) {
    setParsing(true);
    try {
      if (PDF_RE.test(fileName)) {
        const { text, pages } = await extractPdfText(buffer);
        if (!text.trim()) {
          notify('Esse PDF não tem texto selecionável (parece digitalizado). Digite os dados manualmente.', 'error');
        }
        setPdf({ text, pages, fields: extractVehicleFields(text) });
        setFile({ name: fileName });
        return;
      }

      if (/\.(csv|tsv|txt)$/i.test(fileName)) {
        const rows = parseDelimited(new TextDecoder().decode(buffer));
        setSheets([{ name: fileName, rows }]);
      } else {
        // exceljs só é carregado quando alguém realmente importa uma planilha
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        const parsed = wb.worksheets.map((ws) => {
          const width = Math.max(ws.columnCount || 0, ws.actualColumnCount || 0);
          const rows = [];
          // Percorre por índice (não `eachRow`) para não perder o alinhamento
          // das colunas quando há linhas ou células vazias no meio.
          for (let r = 1; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const values = [];
            for (let c = 1; c <= width; c++) values.push(row.getCell(c).value);
            if (values.some((v) => cellText(v).trim())) rows.push(values);
          }
          return { name: ws.name, rows };
        }).filter((s) => s.rows.length);

        if (!parsed.length) throw new Error('A planilha está vazia');
        setSheets(parsed);
      }
      setSheetIdx(0);
      setHeaderAuto(true);
      setFile({ name: fileName });
    } catch (err) {
      notify(err.message || 'Não consegui ler esse arquivo', 'error');
      reset();
    } finally {
      setParsing(false);
    }
  }

  function parseDataUrl(dataUrl, fileName) {
    const base64 = dataUrl.split(',')[1] || '';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    parseBuffer(bytes.buffer, fileName);
  }

  async function handlePick(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const buffer = await picked.arrayBuffer();
    await parseBuffer(buffer, picked.name);
    // guarda o arquivo junto, para ficar registrado de onde veio a importação
    const reader = new FileReader();
    reader.onload = () => addDocument({ name: picked.name, mime: picked.type, size: picked.size, data: reader.result });
    reader.readAsDataURL(picked);
  }

  const sheet = sheets[sheetIdx];
  const fields = mode === 'assets' ? ASSET_FIELDS : ITEM_FIELDS;

  const detected = useMemo(
    () => (sheet ? detectHeaderRow(sheet.rows, fields) : 0),
    [sheet, fields]
  );
  const headerIndex = headerAuto ? detected : Math.min(headerRow, (sheet?.rows.length || 1) - 1);

  const teamByName = useMemo(() => new Map(teams.map((t) => [normKey(t.name), t.id])), [teams]);

  const preview = useMemo(() => {
    if (!sheet) return null;
    const headers = (sheet.rows[headerIndex] || []).map((c) => cellText(c).trim());
    const data = sheet.rows.slice(headerIndex + 1);
    const build = mode === 'assets' ? buildAssetRows : buildItemRows;
    return { ...build({ headers, data, teamByName }), headers };
  }, [sheet, headerIndex, mode, teamByName]);

  async function handleImport() {
    setImporting(true);
    try {
      if (mode === 'assets') {
        const { created, updated, skipped } = await importAssets(preview.list, { updateExisting });
        setResult([
          `${created.length} equipamento(s) criado(s)`,
          updated.length ? `${updated.length} atualizado(s) com dados novos` : null,
          skipped ? `${skipped} sem mudança` : null,
        ].filter(Boolean).join(' · '));
      } else {
        const { created, updated } = await importItems(preview.list);
        setResult(`${created.length} item(ns) criado(s)${updated.length ? ` · ${updated.length} atualizado(s)` : ''}`);
      }
    } catch (err) {
      notify(err.message || 'Erro ao importar', 'error');
    } finally {
      setImporting(false);
    }
  }

  /** Aplica os campos lidos do PDF a um equipamento (existente ou novo). */
  async function applyPdf() {
    const f = pdf.fields;
    setImporting(true);
    try {
      const patch = {};
      if (f.vin) patch.vin = f.vin;
      if (f.plate) patch.plate = f.plate;
      if (f.year) patch.year = f.year;
      if (f.model) patch.model = f.model;
      if (f.owner) patch.owner = f.owner;
      if (f.odometer != null) patch.odometer = f.odometer;

      let target = assets.find((a) => a.id === pdfTarget);
      if (!target) {
        const name = f.plate || f.vin || file.name.replace(PDF_RE, '');
        target = await ensureAssetByName(name);
      }
      // não sobrescreve o que já está preenchido no cadastro
      const safe = Object.fromEntries(
        Object.entries(patch).filter(([k]) => target[k] == null || target[k] === '')
      );
      if (Object.keys(safe).length === 0) {
        setResult(`Nada a preencher — "${target.name}" já tem esses dados.`);
        return;
      }
      await updateAsset(target.id, safe);
      setResult(`${Object.keys(safe).length} campo(s) gravado(s) em "${target.name}"`);
    } catch (err) {
      notify(err.message || 'Erro ao aplicar os dados do PDF', 'error');
    } finally {
      setImporting(false);
    }
  }

  const pdfFilled = pdf ? Object.entries(PDF_FIELD_LABELS).filter(([k]) => pdf.fields[k] != null && pdf.fields[k] !== '') : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar documento"
      subtitle="Planilha (.xlsx/.csv) para criar equipamentos e itens, ou PDF para ler os dados do veículo"
      maxWidth={640}
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {!file && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xltx,.csv,.tsv,.pdf"
              className="hidden"
              onChange={handlePick}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
              className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed py-10"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
            >
              <Upload size={22} strokeWidth={1.7} />
              <span className="mt-2.5 text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                {parsing ? 'Lendo arquivo…' : 'Escolher planilha ou PDF'}
              </span>
              <span className="mt-1 text-[12.5px]">.xlsx · .csv · .pdf</span>
            </button>
          </>
        )}

        {file && (
          <div className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5" style={{ background: 'var(--bg-secondary)' }}>
            {pdf ? <FileText size={15} style={{ color: 'var(--text-tertiary)' }} />
              : <FileSpreadsheet size={15} style={{ color: 'var(--text-tertiary)' }} />}
            <span className="truncate text-[13px] font-medium" style={{ color: 'var(--text)' }}>{file.name}</span>
            <button onClick={reset} className="ml-auto shrink-0 text-[12.5px] font-medium" style={{ color: 'var(--accent)' }}>
              Trocar arquivo
            </button>
          </div>
        )}

        {/* ---------- PDF ---------- */}
        {pdf && (
          <>
            <div className="card overflow-hidden">
              <div className="border-b px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
                <p className="label-caps">Dados reconhecidos no PDF</p>
              </div>
              {pdfFilled.length === 0 ? (
                <p className="px-4 py-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Não encontrei VIN, placa ou modelo nesse arquivo. Veja o texto extraído abaixo e
                  preencha o cadastro manualmente.
                </p>
              ) : (
                <div className="row-divide">
                  {pdfFilled.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{String(pdf.fields[key])}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pdf.fields.allVins.length > 1 && (
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                Outros VINs no documento: {pdf.fields.allVins.slice(1).join(', ')}
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Gravar em qual equipamento?
              </label>
              <select value={pdfTarget} onChange={(e) => setPdfTarget(e.target.value)} className="input-apple">
                <option value="">— Criar novo a partir do documento —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.plate ? ` · ${a.plate}` : ''}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                Só são gravados os campos que ainda estiverem vazios no cadastro.
              </p>
            </div>

            <button onClick={() => setShowText((v) => !v)} className="btn-ghost w-full py-2 text-[12.5px]">
              {showText ? 'Ocultar texto extraído' : `Ver texto extraído (${pdf.pages.length} página(s))`}
            </button>
            {showText && (
              <pre
                className="max-h-[240px] overflow-auto whitespace-pre-wrap rounded-lg px-3.5 py-3 text-[11.5px] leading-relaxed"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {pdf.text || '(sem texto)'}
              </pre>
            )}

            {result && <ResultBox text={result} />}

            <button
              onClick={applyPdf}
              disabled={importing || pdfFilled.length === 0}
              className="btn-primary w-full py-2.5 text-[13.5px] disabled:opacity-50"
            >
              {importing ? 'Gravando…' : 'Gravar dados no equipamento'}
            </button>
          </>
        )}

        {/* ---------- Planilha ---------- */}
        {sheet && preview && (
          <>
            <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
              <ModeTab active={mode === 'assets'} onClick={() => { setMode('assets'); setResult(null); }}>Equipamentos</ModeTab>
              <ModeTab active={mode === 'items'} onClick={() => { setMode('items'); setResult(null); }}>Itens de estoque</ModeTab>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {sheets.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Aba</label>
                  <select
                    value={sheetIdx}
                    onChange={(e) => { setSheetIdx(Number(e.target.value)); setHeaderAuto(true); setResult(null); }}
                    className="input-apple"
                  >
                    {sheets.map((s, i) => <option key={s.name} value={i}>{s.name} ({s.rows.length} linhas)</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Linha do cabeçalho
                </label>
                <select
                  value={headerIndex}
                  onChange={(e) => { setHeaderAuto(false); setHeaderRow(Number(e.target.value)); setResult(null); }}
                  className="input-apple"
                >
                  {sheet.rows.slice(0, 20).map((r, i) => (
                    <option key={i} value={i}>
                      Linha {i + 1}: {r.map((c) => cellText(c).trim()).filter(Boolean).slice(0, 4).join(' | ').slice(0, 48) || '(vazia)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {preview.error ? (
              <p className="rounded-lg px-3.5 py-3 text-[13px]" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {preview.error}
              </p>
            ) : (
              <>
                <div className="rounded-lg px-3.5 py-3" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-[12.5px]" style={{ color: 'var(--text)' }}>
                    <strong>{preview.list.length}</strong> linha(s) · colunas lidas:{' '}
                    {Object.keys(preview.cols).map((k) => fieldLabel(fields, k)).join(', ')}
                  </p>
                  {preview.extras.length > 0 && (
                    <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      Colunas extras guardadas em Observações: {preview.extras.join(', ')}
                    </p>
                  )}
                </div>

                {mode === 'assets' && (
                  <label className="flex items-center gap-2.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Completar equipamentos que já existem com os campos que estiverem vazios
                  </label>
                )}

                <div className="card max-h-[240px] overflow-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        {mode === 'assets'
                          ? <><th>Nome</th><th>Categoria</th><th>Modelo</th><th>Placa</th><th>VIN</th><th>Equipe</th></>
                          : <><th>Item</th><th className="!text-right">Qtd</th><th className="!text-right">Preço</th><th>Equipe</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.list.slice(0, 40).map((r, i) => (
                        <tr key={i}>
                          <td className="cell-strong">{r.name}</td>
                          {mode === 'assets' ? (
                            <>
                              <td>{r.tipo || '—'}</td>
                              <td>{r.model || '—'}</td>
                              <td>{r.plate || '—'}</td>
                              <td className="whitespace-nowrap">{r.vin || '—'}</td>
                              <td>{teams.find((t) => t.id === r.team_id)?.name || 'Yard'}</td>
                            </>
                          ) : (
                            <>
                              <td className="text-right tabular-nums">{r.quantity}</td>
                              <td className="text-right tabular-nums">{r.unitPrice || '—'}</td>
                              <td>{teams.find((t) => t.id === r.teamId)?.name || 'Yard'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.list.length > 40 && (
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    Mostrando as 40 primeiras — a importação leva todas as {preview.list.length}.
                  </p>
                )}
              </>
            )}

            {result && <ResultBox text={result} />}

            <button
              onClick={handleImport}
              disabled={importing || Boolean(preview.error) || preview.list.length === 0 || Boolean(result)}
              className="btn-primary w-full py-2.5 text-[13.5px] disabled:opacity-50"
            >
              {importing ? 'Importando…' : result ? 'Importado' : `Importar ${preview.list.length}`}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function ResultBox({ text }) {
  return (
    <p className="rounded-lg px-3.5 py-3 text-[13px] font-medium" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
      {text}
    </p>
  );
}

function ModeTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
      style={{
        background: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-secondary)',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
      }}
    >
      {children}
    </button>
  );
}
