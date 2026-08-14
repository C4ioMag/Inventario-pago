import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Sparkles, Tags, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

/** Tipos que já existem na frota — atalho para não cadastrar um a um. */
const DEFAULTS = [
  'Truck', 'Trailer', 'Locator', 'Utility Locator', 'Vermeer',
  'Ditch Witch', 'Vacuum', 'Excavator', 'Compressor', 'Forklift', 'GPRS',
];

export default function Categories() {
  const { categories, assets, loading, addCategory, addCategoriesBulk, updateCategory, removeCategory } = useData();
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const usage = useMemo(() => {
    const map = new Map();
    for (const a of assets) map.set(a.tipo, (map.get(a.tipo) || 0) + 1);
    return map;
  }, [assets]);

  const missingDefaults = DEFAULTS.filter(
    (d) => !categories.some((c) => c.name.toLowerCase() === d.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Tipos de equipamento usados no cadastro da frota"
      >
        {missingDefaults.length > 0 && (
          <button
            onClick={() => addCategoriesBulk(missingDefaults)}
            className="btn-ghost flex items-center gap-2 px-3.5 py-2 text-[13px]"
          >
            <Sparkles size={15} /> Adicionar padrões da frota ({missingDefaults.length})
          </button>
        )}
        <button onClick={() => setForm({})} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Nova categoria
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-11" />)}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Nenhuma categoria cadastrada"
            hint="As categorias aparecem como opções de tipo ao cadastrar um equipamento."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => addCategoriesBulk(DEFAULTS)} className="btn-primary px-4 py-2 text-[13px]">
                  Usar padrões da frota
                </button>
                <button onClick={() => setForm({})} className="btn-ghost px-4 py-2 text-[13px]">
                  Criar do zero
                </button>
              </div>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className="!text-right">Equipamentos</th>
                  <th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-strong">{c.name}</td>
                    <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{usage.get(c.name) || 0}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Editar" onClick={() => setForm({ row: c })}><Pencil size={13} /></IconBtn>
                        <IconBtn title="Excluir" danger onClick={() => setConfirm(c)}><Trash2 size={13} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryModal
        open={Boolean(form)}
        row={form?.row}
        onClose={() => setForm(null)}
        onSubmit={(name) => (form?.row ? updateCategory(form.row.id, { name }) : addCategory(name))}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Excluir "${confirm?.name}"?`}
        message={
          (usage.get(confirm?.name) || 0) > 0
            ? `${usage.get(confirm.name)} equipamento(s) usam essa categoria. Eles continuam existindo com o tipo atual, mas a categoria some da lista de opções.`
            : 'A categoria some da lista de opções ao cadastrar equipamentos.'
        }
        confirmLabel="Excluir categoria"
        onConfirm={() => removeCategory(confirm.id)}
      />
    </div>
  );
}

function CategoryModal({ open, row, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(row?.name || '');
  }, [open, row]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={row ? 'Editar categoria' : 'Nova categoria'} maxWidth={400}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Nome</label>
          <input
            required autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Truck"
            className="input-apple"
          />
        </div>
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : row ? 'Salvar alterações' : 'Adicionar categoria'}
        </button>
      </form>
    </Modal>
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
