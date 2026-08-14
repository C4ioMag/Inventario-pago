import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Boxes, Building2, MapPin, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const CONFIG = {
  categorias: {
    kind: 'categories',
    title: 'Categorias',
    subtitle: 'Agrupam itens e equipamentos por natureza',
    singular: 'categoria',
    article: 'a',
    icon: Tags,
    placeholder: 'Ex: Sinalização',
    extra: [{ field: 'kind', label: 'Aplica-se a', type: 'select', options: [
      { value: 'item', label: 'Itens' },
      { value: 'asset', label: 'Equipamentos' },
      { value: 'ambos', label: 'Ambos' },
    ], default: 'item' }],
  },
  fornecedores: {
    kind: 'suppliers',
    title: 'Fornecedores',
    subtitle: 'De quem você compra os itens',
    singular: 'fornecedor',
    article: 'o',
    icon: Building2,
    placeholder: 'Ex: AutoZone',
    extra: [
      { field: 'contact', label: 'Contato', type: 'text', placeholder: 'Telefone ou e-mail' },
      { field: 'notes', label: 'Observações', type: 'text', placeholder: 'Opcional' },
    ],
  },
  marcas: {
    kind: 'brands',
    title: 'Marcas',
    subtitle: 'Fabricantes dos equipamentos',
    singular: 'marca',
    article: 'a',
    icon: Boxes,
    placeholder: 'Ex: Ford',
    extra: [],
  },
  locais: {
    kind: 'locations',
    title: 'Locais',
    subtitle: 'Depósitos, pátios e obras',
    singular: 'local',
    article: 'o',
    icon: MapPin,
    placeholder: 'Ex: Yard Apopka FL',
    extra: [],
  },
};

export default function Registry() {
  const { kind: routeKind } = useParams();
  const config = CONFIG[routeKind];
  const { registries, items, assets, loading, addRegistry, updateRegistry, removeRegistry } = useData();

  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const rows = config ? registries[config.kind] || [] : [];

  const usageOf = useMemo(() => {
    if (!config) return () => 0;
    const key = config.kind === 'categories' ? 'category_id'
      : config.kind === 'brands' ? 'brand_id'
      : config.kind === 'locations' ? 'location_id'
      : 'supplier_id';
    return (id) =>
      items.filter((i) => i[key] === id).length + assets.filter((a) => a[key] === id).length;
  }, [config, items, assets]);

  if (!config) {
    return <PageHeader title="Cadastro não encontrado" subtitle="Escolha uma opção válida no menu lateral." />;
  }

  const Icon = config.icon;

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle}>
        <button onClick={() => setForm({})} className="btn-primary flex items-center gap-2 px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Nov{config.article} {config.singular}
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-11" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={`Nenhum${config.article === 'a' ? 'a' : ''} ${config.singular} cadastrad${config.article}`}
            hint={`Cadastre para classificar itens e equipamentos por ${config.singular}.`}
            action={<button onClick={() => setForm({})} className="btn-primary px-4 py-2 text-[13px]">Adicionar</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nome</th>
                  {config.extra.map((f) => <th key={f.field}>{f.label}</th>)}
                  <th className="!text-right">Em uso</th>
                  <th className="!text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.name}</td>
                    {config.extra.map((f) => <td key={f.field}>{r[f.field] || '—'}</td>)}
                    <td className="text-right tabular-nums" style={{ color: 'var(--text)' }}>{usageOf(r.id)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Editar" onClick={() => setForm({ row: r })}><Pencil size={13} /></IconBtn>
                        <IconBtn title="Excluir" danger onClick={() => setConfirm(r)}><Trash2 size={13} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RegistryModal
        open={Boolean(form)}
        row={form?.row}
        config={config}
        onClose={() => setForm(null)}
        onSubmit={(fields) => (form?.row
          ? updateRegistry(config.kind, form.row.id, fields)
          : addRegistry(config.kind, fields))}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Excluir "${confirm?.name}"?`}
        message={`Itens e equipamentos que usam ess${config.article} ${config.singular} continuam existindo — apenas ficam sem ${config.article === 'a' ? 'ela' : 'ele'}.`}
        confirmLabel="Excluir"
        onConfirm={() => removeRegistry(config.kind, confirm.id)}
      />
    </div>
  );
}

function RegistryModal({ open, row, config, onClose, onSubmit }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = { name: '' };
    for (const f of config.extra) base[f.field] = f.default || '';
    setForm(row ? { ...base, ...row } : base);
  }, [open, row, config]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: (form.name || '').trim() };
      for (const f of config.extra) payload[f.field] = form[f.field] || null;
      await onSubmit(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? `Editar ${config.singular}` : `Nov${config.article} ${config.singular}`}
      maxWidth={420}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Nome</label>
          <input
            required autoFocus
            value={form.name || ''}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={config.placeholder}
            className="input-apple"
          />
        </div>
        {config.extra.map((f) => (
          <div key={f.field}>
            <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={form[f.field] || f.default}
                onChange={(e) => setForm((s) => ({ ...s, [f.field]: e.target.value }))}
                className="input-apple"
              >
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                value={form[f.field] || ''}
                onChange={(e) => setForm((s) => ({ ...s, [f.field]: e.target.value }))}
                placeholder={f.placeholder}
                className="input-apple"
              />
            )}
          </div>
        ))}
        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : row ? 'Salvar alterações' : 'Adicionar'}
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
