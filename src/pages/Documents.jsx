import { useMemo, useRef, useState } from 'react';
import {
  Download, FileSpreadsheet, FileText, Image as ImageIcon, Table, Trash2, Upload,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportModal from '../components/ImportModal';
import { fmtDateTime } from '../lib/format';

const MAX_MB = 4;
const SHEET_RE = /\.(xlsx|xlsm|csv)$/i;

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(name, mime) {
  if (SHEET_RE.test(name) || (mime || '').includes('sheet')) return FileSpreadsheet;
  if ((mime || '').startsWith('image/')) return ImageIcon;
  return FileText;
}

export default function Documents() {
  const { documents, assets, teams, loading, dbConnected, addDocument, removeDocument } = useData();
  const { notify } = useToast();
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const nameOf = useMemo(() => {
    const a = new Map(assets.map((x) => [x.id, x.name]));
    const t = new Map(teams.map((x) => [x.id, x.name]));
    return (doc) => (doc.asset_id && a.get(doc.asset_id)) || (doc.team_id && t.get(doc.team_id)) || '—';
  }, [assets, teams]);

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > MAX_MB * 1024 * 1024) {
          notify(`"${file.name}" tem mais de ${MAX_MB} MB e não foi enviado`, 'error');
          continue;
        }
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await addDocument({ name: file.name, mime: file.type, size: file.size, data });
      }
    } catch {
      notify('Não foi possível ler o arquivo', 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function download(doc) {
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.name;
    a.click();
  }

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Guarde PDFs, planilhas e fotos — ou importe uma planilha direto para o sistema"
      >
        <button
          onClick={() => setImportFile('pick')}
          className="btn-ghost flex items-center gap-2 px-3.5 py-2 text-[13px]"
        >
          <Table size={15} /> Importar planilha
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]"
        >
          <Upload size={15} /> {uploading ? 'Enviando…' : 'Enviar arquivo'}
        </button>
      </PageHeader>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center transition-colors"
        style={{
          borderColor: dragging ? 'var(--accent)' : 'var(--border-strong)',
          background: dragging ? 'var(--accent-soft)' : 'transparent',
        }}
      >
        <Upload size={22} strokeWidth={1.7} style={{ color: dragging ? 'var(--accent)' : 'var(--text-tertiary)' }} />
        <p className="mt-2.5 text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
          Arraste arquivos aqui ou clique para escolher
        </p>
        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          PDF, planilhas e imagens · até {MAX_MB} MB por arquivo
        </p>
      </div>

      {!dbConnected && (
        <p className="mb-4 rounded-lg px-4 py-3 text-[12.5px]" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
          Sem banco de dados configurado, os arquivos ficam salvos só neste navegador e o espaço é
          limitado (poucos MB no total). Configure o Supabase para guardar de verdade.
        </p>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-11" />)}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento enviado"
            hint="Envie notas fiscais, manuais, fotos de avaria ou a planilha da frota."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Arquivo</th><th>Vinculado a</th>
                  <th className="!text-right">Tamanho</th><th>Enviado em</th><th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => {
                  const Icon = iconFor(d.name, d.mime);
                  const isSheet = SHEET_RE.test(d.name);
                  return (
                    <tr key={d.id}>
                      <td>
                        <span className="flex items-center gap-2.5">
                          <Icon size={15} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
                          <span className="cell-strong">{d.name}</span>
                        </span>
                      </td>
                      <td>{nameOf(d)}</td>
                      <td className="text-right tabular-nums">{fmtSize(d.size)}</td>
                      <td className="whitespace-nowrap tabular-nums">{fmtDateTime(d.created_at)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {isSheet && (
                            <IconBtn title="Importar dados desta planilha" onClick={() => setImportFile(d)}>
                              <Table size={13} />
                            </IconBtn>
                          )}
                          <IconBtn title="Baixar" onClick={() => download(d)}>
                            <Download size={13} />
                          </IconBtn>
                          <IconBtn title="Excluir" danger onClick={() => setConfirm(d)}>
                            <Trash2 size={13} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ImportModal
        open={Boolean(importFile)}
        document={importFile === 'pick' ? null : importFile}
        onClose={() => setImportFile(null)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Excluir "${confirm?.name}"?`}
        message="O arquivo será removido do sistema. Essa ação não pode ser desfeita."
        confirmLabel="Excluir arquivo"
        onConfirm={() => removeDocument(confirm.id)}
      />
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
      style={{ borderColor: 'var(--border)', color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}
