import { useMemo, useRef, useState } from 'react';
import { Download, FolderOpen, Trash2, Upload, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import { DOC_CATEGORIES, docCategory, fmtSize, isImage } from '../lib/documents';
import { fmtDateTime } from '../lib/format';

const MAX_MB = 4;

/** Documentos do equipamento, separados por categoria (DOT, Registration, Seguro, Fotos, Documentos). */
export default function AssetDocuments({ assetId, documents, onUpload, onRemove }) {
  const { notify } = useToast();
  const inputRef = useRef(null);

  const [tab, setTab] = useState(DOC_CATEGORIES[0].value);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState(null);

  const byCategory = useMemo(() => {
    const map = new Map(DOC_CATEGORIES.map((c) => [c.value, []]));
    for (const d of documents) {
      const key = map.has(d.category) ? d.category : 'documentos';
      map.get(key).push(d);
    }
    return map;
  }, [documents]);

  const current = byCategory.get(tab) || [];
  const meta = docCategory(tab);

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > MAX_MB * 1024 * 1024) {
          notify(`"${file.name}" passa de ${MAX_MB} MB e não foi enviado`, 'error');
          continue;
        }
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await onUpload({
          name: file.name,
          mime: file.type,
          size: file.size,
          data,
          assetId,
          category: tab,
        });
      }
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
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Documentos</h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-primary flex items-center gap-2 px-3 py-1.5 text-[12.5px]"
        >
          <Upload size={13} /> {uploading ? 'Enviando…' : `Enviar para ${meta.label}`}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Categorias */}
      <div className="flex flex-wrap gap-1.5 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}>
        {DOC_CATEGORIES.map((c) => {
          const n = (byCategory.get(c.value) || []).length;
          const active = tab === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setTab(c.value)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
              style={{
                background: active ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <c.icon size={13} />
              {c.label}
              {n > 0 && (
                <span
                  className="rounded px-1.5 text-[11px] tabular-nums"
                  style={{ background: active ? 'var(--accent)' : 'var(--border-strong)', color: active ? '#fff' : 'var(--text)' }}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Área de upload / lista */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className="p-5"
        style={dragging ? { background: 'var(--accent-soft)', outline: '2px dashed var(--accent)', outlineOffset: '-10px' } : undefined}
      >
        <p className="mb-4 text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>
          {meta.hint} · arraste arquivos aqui ou use o botão acima (até {MAX_MB} MB cada)
        </p>

        {current.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={`Nenhum arquivo em ${meta.label}`}
            hint="Aceita fotos, PDF, Word e planilhas."
          />
        ) : tab === 'fotos' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {current.map((d) => (
              <div key={d.id} className="group relative overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                {isImage(d) ? (
                  <button onClick={() => setPreview(d)} className="block w-full">
                    <img src={d.data} alt={d.name} className="h-[120px] w-full object-cover" />
                  </button>
                ) : (
                  <div className="flex h-[120px] items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                    <FolderOpen size={22} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="truncate text-[12px]" style={{ color: 'var(--text)' }}>{d.name}</span>
                  <div className="flex shrink-0 gap-1">
                    <MiniBtn title="Baixar" onClick={() => download(d)}><Download size={12} /></MiniBtn>
                    <MiniBtn title="Excluir" danger onClick={() => setConfirm(d)}><Trash2 size={12} /></MiniBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="tbl">
              <thead>
                <tr><th>Arquivo</th><th className="!text-right">Tamanho</th><th className="!text-right">Enviado em</th><th className="!text-right">Ações</th></tr>
              </thead>
              <tbody>
                {current.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-strong">
                      {isImage(d) ? (
                        <button onClick={() => setPreview(d)} className="underline-offset-2 hover:underline">{d.name}</button>
                      ) : d.name}
                    </td>
                    <td className="text-right tabular-nums">{fmtSize(d.size)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{fmtDateTime(d.created_at)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <MiniBtn title="Baixar" onClick={() => download(d)}><Download size={12} /></MiniBtn>
                        <MiniBtn title="Excluir" danger onClick={() => setConfirm(d)}><Trash2 size={12} /></MiniBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visualizador de imagem */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setPreview(null)}
        >
          <button
            onClick={() => setPreview(null)}
            className="btn-ghost absolute right-6 top-6 flex h-9 w-9 items-center justify-center"
            aria-label="Fechar"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <X size={16} />
          </button>
          <img
            src={preview.data}
            alt={preview.name}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Excluir "${confirm?.name}"?`}
        message="O arquivo é removido do equipamento e não pode ser recuperado."
        confirmLabel="Excluir arquivo"
        onConfirm={() => onRemove(confirm.id)}
      />
    </section>
  );
}

function MiniBtn({ children, title, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-6 w-6 items-center justify-center rounded border transition-colors"
      style={{ borderColor: 'var(--border)', color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}
