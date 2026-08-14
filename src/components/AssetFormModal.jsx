import { useEffect, useState } from 'react';
import Modal from './Modal';

const TIPOS = [
  'Truck', 'Trailer', 'Excavator', 'Vermeer', 'Ditch Witch',
  'Locator', 'Utility Locator', 'Vacuum', 'Compressor', 'Forklift', 'GPRS', 'Outro',
];

const BLANK = {
  tipo: 'Truck', name: '', model: '', year: '', plate: '', vin: '',
  team_id: '', supervisor: '', owner: '', notes: '', status: 'disponivel',
  category_id: '', brand_id: '', location_id: '',
  verizon: '', bouncie: '', samsung: '', e_pass: '',
};

export default function AssetFormModal({ open, onClose, onSubmit, asset, teams, registries, defaultTeamId }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(asset);
  const reg = registries || { categories: [], brands: [], locations: [] };

  useEffect(() => {
    if (!open) return;
    if (asset) {
      setForm({
        ...BLANK,
        ...asset,
        team_id: asset.team_id || '',
        category_id: asset.category_id || '',
        brand_id: asset.brand_id || '',
        location_id: asset.location_id || '',
        status: asset.status || 'disponivel',
      });
    } else {
      setForm({ ...BLANK, team_id: defaultTeamId || '' });
    }
  }, [open, asset, defaultTeamId]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        team_id: form.team_id || null,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        location_id: form.location_id || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar equipamento' : 'Novo equipamento'}
      subtitle={isEdit ? asset?.name : 'Cadastre um veículo, trailer ou máquina'}
      maxWidth={600}
    >
      <form onSubmit={handleSubmit} className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
        <Section title="Identificação">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome / Código" span>
              <input required value={form.name} onChange={set('name')} placeholder="Ex: TRK-034" className="input-apple" />
            </Field>
            <Field label="Tipo">
              <select value={form.tipo} onChange={set('tipo')} className="input-apple">
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Modelo">
              <input value={form.model} onChange={set('model')} placeholder="Ex: F-550" className="input-apple" />
            </Field>
            <Field label="Ano">
              <input value={form.year} onChange={set('year')} placeholder="Ex: 2022" className="input-apple" />
            </Field>
            <Field label="Placa">
              <input value={form.plate} onChange={set('plate')} placeholder="Ex: DY69VH" className="input-apple" />
            </Field>
            <Field label="VIN Number" span>
              <input
                value={form.vin}
                onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }))}
                placeholder="Ex: 1HTMMAAL57H542831"
                className="input-apple uppercase"
              />
            </Field>
          </div>
        </Section>

        <Section title="Organização">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Equipe">
              <select value={form.team_id} onChange={set('team_id')} className="input-apple">
                <option value="">Sem equipe</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className="input-apple">
                <option value="disponivel">Disponível</option>
                <option value="em_uso">Em uso</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </Field>
            <Field label="Supervisor">
              <input value={form.supervisor} onChange={set('supervisor')} placeholder="Ex: Felipe Donato" className="input-apple" />
            </Field>
            <Field label="Proprietário">
              <input value={form.owner} onChange={set('owner')} placeholder="Ex: Power Connect USA" className="input-apple" />
            </Field>
            <Field label="Categoria">
              <select value={form.category_id} onChange={set('category_id')} className="input-apple">
                <option value="">— Nenhuma —</option>
                {reg.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Marca">
              <select value={form.brand_id} onChange={set('brand_id')} className="input-apple">
                <option value="">— Nenhuma —</option>
                {reg.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Local" span>
              <select value={form.location_id} onChange={set('location_id')} className="input-apple">
                <option value="">— Nenhum —</option>
                {reg.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Rastreamento & dispositivos">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Verizon">
              <input value={form.verizon} onChange={set('verizon')} placeholder="Linha / IMEI" className="input-apple" />
            </Field>
            <Field label="Bouncie">
              <input value={form.bouncie} onChange={set('bouncie')} placeholder="ID do rastreador" className="input-apple" />
            </Field>
            <Field label="Samsung">
              <input value={form.samsung} onChange={set('samsung')} placeholder="Tablet / dispositivo" className="input-apple" />
            </Field>
            <Field label="E-ZPass">
              <input value={form.e_pass} onChange={set('e_pass')} placeholder="Transponder" className="input-apple" />
            </Field>
          </div>
        </Section>

        <Section title="Observações">
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Notas gerais sobre o equipamento"
            className="input-apple resize-none"
          />
        </Section>

        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Adicionar equipamento'}
        </button>
      </form>
    </Modal>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <p className="label-caps mb-2.5">{title}</p>
      {children}
    </section>
  );
}

function Field({ label, children, span }) {
  return (
    <div className={span ? 'col-span-2' : undefined}>
      <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}
