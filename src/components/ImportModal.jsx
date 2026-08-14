import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

/** Nomes de coluna aceitos para cada campo — cobre PT e EN, sem acento. */
const ASSET_COLUMNS = {
  name: ['codigo', 'code', 'nome', 'name', 'equipamento', 'asset'],
  tipo: ['tipo', 'type', 'categoria', 'category'],
  model: ['modelo', 'model'],
  plate: ['placa', 'plate', 'tag'],
  vin: ['vin', 'vin number', 'chassi'],
  year: ['ano', 'year'],
  team: ['equipe', 'team', 'crew'],
  supervisor: ['supervisor', 'responsavel'],
  owner: ['proprietario', 'owner'],
  notes: ['observacao', 'observacoes', 'notes', 'obs'],
};

const ITEM_COLUMNS = {
  name: ['item', 'nome', 'name', 'produto', 'descricao'],
  quantity: ['quantidade', 'qtd', 'quantity', 'qty'],
  unitPrice: ['preco', 'preço', 'valor', 'price', 'unit price', 'custo'],
  minQuantity: ['minimo', 'estoque minimo', 'min'],
  team: ['equipe', 'team', 'crew'],
};

const norm = (v) => String(v ?? '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

function pickColumn(headers, candidates) {
  const idx = headers.findIndex((h) => candidates.includes(norm(h)));
  return idx === -1 ? null : idx;
}

export default function ImportModal({ open, document: doc, onClose }) {
  const { teams, importAssets, importItems, addDocument } = useData();
  const { notify } = useToast();
  const inputRef = useRef(null);

  const [mode, setMode] = useState('assets');
  const [rows, setRows] = useState(null);      // { headers, data, fileName }
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setResult(null);
    setMode('assets');
    if (doc?.data) parseDataUrl(doc.data, doc.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc]);

  async function parseBuffer(buffer, fileName) {
    setParsing(true);
    try {
      // exceljs só é carregado quando alguém realmente importa uma planilha
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();

      if (/\.csv$/i.test(fileName)) {
        const text = new TextDecoder().decode(buffer);
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const split = (line) => line.split(/[;,\t]/).map((c) => c.replace(/^"|"$/g, '').trim());
        const headers = split(lines[0] || '');
        const data = lines.slice(1).map(split);
        setRows({ headers, data, fileName });
      } else {
        await wb.xlsx.load(buffer);
        const ws = wb.worksheets[0];
        if (!ws) throw new Error('Planilha vazia');
        const all = [];
        ws.eachRow((row) => {
          const values = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            const v = cell.value;
            values.push(v && typeof v === 'object' ? (v.text ?? v.result ?? '') : (v ?? ''));
          });
          all.push(values);
        });
        const [headers = [], ...data] = all;
        setRows({ headers: headers.map(String), data, fileName });
      }
    } catch (err) {
      notify(err.message || 'Não consegui ler essa planilha', 'error');
      setRows(null);
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
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await parseBuffer(buffer, file.name);
    // guarda o arquivo junto, para ficar registrado de onde veio a importação
    const reader = new FileReader();
    reader.onload = () => addDocument({ name: file.name, mime: file.type, size: file.size, data: reader.result });
    reader.readAsDataURL(file);
  }

  const teamByName = new Map(teams.map((t) => [norm(t.name), t.id]));

  function buildRows() {
    const { headers, data } = rows;
    const map = mode === 'assets' ? ASSET_COLUMNS : ITEM_COLUMNS;
    const cols = Object.fromEntries(
      Object.entries(map).map(([field, candidates]) => [field, pickColumn(headers, candidates)])
    );
    if (cols.name == null) return { error: 'Não achei a coluna com o nome/código. Renomeie a coluna para "Nome" ou "Código".', list: [] };

    const list = data
      .map((r) => {
        const get = (f) => (cols[f] == null ? '' : String(r[cols[f]] ?? '').trim());
        const name = get('name');
        if (!name) return null;
        const teamId = teamByName.get(norm(get('team'))) || null;

        if (mode === 'assets') {
          return {
            name,
            tipo: get('tipo') || null,
            model: get('model') || null,
            plate: get('plate') || null,
            vin: get('vin') || null,
            year: get('year') || null,
            supervisor: get('supervisor') || null,
            owner: get('owner') || null,
            notes: get('notes') || null,
            team_id: teamId,
            status: 'disponivel',
          };
        }
        return {
          name,
          quantity: Number(String(get('quantity')).replace(',', '.')) || 0,
          unitPrice: Number(String(get('unitPrice')).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0,
          minQuantity: Number(get('minQuantity')) || 0,
          teamId,
        };
      })
      .filter(Boolean);

    return { list, cols };
  }

  const preview = rows ? buildRows() : null;

  async function handleImport() {
    setImporting(true);
    try {
      if (mode === 'assets') {
        const created = await importAssets(preview.list);
        setResult(`${created.length} equipamento(s) importado(s)${preview.list.length - created.length > 0 ? ` · ${preview.list.length - created.length} já existia(m)` : ''}`);
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

  return (
    <Modal open={open} onClose={onClose} title="Importar planilha" subtitle="Cria equipamentos ou itens em lote" maxWidth={600}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
          <ModeTab active={mode === 'assets'} onClick={() => setMode('assets')}>Equipamentos</ModeTab>
          <ModeTab active={mode === 'items'} onClick={() => setMode('items')}>Itens de estoque</ModeTab>
        </div>

        {!rows && (
          <>
            <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.csv" className="hidden" onChange={handlePick} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
              className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed py-10"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
            >
              <Upload size={22} strokeWidth={1.7} />
              <span className="mt-2.5 text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                {parsing ? 'Lendo planilha…' : 'Escolher planilha (.xlsx ou .csv)'}
              </span>
            </button>
          </>
        )}

        {rows && preview && (
          <>
            <div className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5" style={{ background: 'var(--bg-secondary)' }}>
              <FileSpreadsheet size={15} style={{ color: 'var(--text-tertiary)' }} />
              <span className="truncate text-[13px] font-medium" style={{ color: 'var(--text)' }}>{rows.fileName}</span>
              <span className="ml-auto shrink-0 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                {preview.list.length} linha(s)
              </span>
            </div>

            {preview.error ? (
              <p className="rounded-lg px-3.5 py-3 text-[13px]" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {preview.error}
              </p>
            ) : (
              <>
                <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  Colunas reconhecidas: {Object.entries(preview.cols)
                    .filter(([, v]) => v != null)
                    .map(([k]) => k)
                    .join(', ')}. As demais são ignoradas.
                </p>

                <div className="card max-h-[240px] overflow-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        {mode === 'assets'
                          ? <><th>Nome</th><th>Categoria</th><th>Modelo</th><th>Placa</th><th>Equipe</th></>
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

            {result && (
              <p className="rounded-lg px-3.5 py-3 text-[13px] font-medium" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
                {result}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setRows(null); setResult(null); }} className="btn-ghost flex-1 py-2.5 text-[13.5px]">
                Trocar planilha
              </button>
              <button
                onClick={handleImport}
                disabled={importing || Boolean(preview.error) || preview.list.length === 0 || Boolean(result)}
                className="btn-primary flex-1 py-2.5 text-[13.5px]"
              >
                {importing ? 'Importando…' : result ? 'Importado' : `Importar ${preview.list.length}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
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
