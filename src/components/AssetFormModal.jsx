import { useEffect, useState } from 'react';
import Modal from './Modal';

const TIPOS = [
  'Truck', 'Trailer', 'Excavator', 'Vermeer', 'Ditch Witch',
  'Locator', 'Utility Locator', 'Vacuum', 'Compressor', 'Forklift', 'Outro',
];

const BLANK = {
  tipo: 'Truck', name: '', model: '', year: '', plate: '', vin: '',
  team_id: '', supervisor: '', owner: '', notes: '',
  verizon: '', bouncie: '', samsung: '', e_pass: '',
};

export default function AssetFormModal({ open, onClose, onSubmit, asset, teams, defaultTeamId }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(asset);

  useEffect(() => {
    if (!open) return;
    if (asset) {
      setForm({ ...BLANK, ...asset, team_id: asset.team_id || '' });
    } else {
      setForm({ ...BLANK, team_id: defaultTeamId || '' });
    }
  }, [open, asset, defaultTeamId]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, team_id: form.team_id || null, name: form.name.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar veículo' : 'Novo veículo'}
      subtitle="Informações do asset"
      maxWidth={560}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <section className="space-y-3">
          <p className="label-caps">Identificação</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Nome</label>
              <input required value={form.name} onChange={set('name')} placeholder="Ex: TRK-034" className="input-apple" />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Tipo</label>
              <select value={form.tipo} onChange={set('tipo')} className="input-apple">
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Modelo</label>
              <input value={form.model} onChange={set('model')} placeholder="Ex: F-550" className="input-apple" />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Ano</label>
              <input value={form.year} onChange={set('year')} placeholder="Ex: 2022" className="input-apple" />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Placa</label>
              <input value={form.plate} onChange={set('plate')} placeholder="Ex: DY69VH" className="input-apple" />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>VIN Number</label>
              <input value={form.vin} onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }))} placeholder="Ex: 1HTMMAAL57H542831" className="input-apple uppercase" />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className="label-caps">Organização</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Equipe</label>
              <select value={form.team_id} onChange={set('team_id')} className="input-apple">
                <option value="">Sem equipe</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Supervisor</label>
              <input value={form.supervisor} onChange={set('supervisor')} placeholder="Ex: Felipe Donato" className="input-apple" />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Proprietário</label>
              <input value={form.owner} onChange={set('owner')} placeholder="Ex: Power Connect USA" className="input-apple" />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className="label-caps">Rastreamento &amp; dispositivos</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Verizon</label>
              <input value={form.verizon} onChange={set('verizon')} placeholder="Linha / IMEI" className="input-apple" />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Bouncie</label>
              <input value={form.bouncie} onChange={set('bouncie')} placeholder="ID do rastreador" className="input-apple" />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Samsung</label>
              <input value={form.samsung} onChange={set('samsung')} placeholder="Tablet / dispositivo" className="input-apple" />
            </div>
            <div>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>E-ZPass</label>
              <input value={form.e_pass} onChange={set('e_pass')} placeholder="Transponder" className="input-apple" />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <label className="label-caps mb-2 block">Observações</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Notas gerais sobre o veículo"
            className="input-apple resize-none"
          />
        </section>

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-[15px]">
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Adicionar veículo'}
        </button>
      </form>
    </Modal>
  );
}
