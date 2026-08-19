import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { MAINTENANCE_TYPES, oilStatus, fmtNum } from '../lib/maintenance';
import { yesNo } from '../lib/format';
import { fmtDate } from '../lib/format';
import TeamOptions from './TeamOptions';

const BLANK = {
  tipo: '', name: '', model: '', year: '', plate: '', vin: '',
  team_id: '', supervisor: '', driver: '', owner: '', city: '', state: '', notes: '', status: 'disponivel',
  odometer: '', oil_interval: '', last_oil_odometer: '', last_oil_date: '',
  verizon: '', bouncie: '', samsung: '', e_pass: '',
};

const BLANK_ENTRY = { type: 'oleo', partName: '', date: '', odometer: '', notes: '' };

export default function AssetFormModal({ open, onClose, onSubmit, asset, teams, categories = [], defaultTeamId }) {
  const [form, setForm] = useState(BLANK);
  const [entries, setEntries] = useState([]);
  const [entry, setEntry] = useState(BLANK_ENTRY);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(asset);

  useEffect(() => {
    if (!open) return;
    setEntries([]);
    setEntry(BLANK_ENTRY);
    if (asset) {
      setForm({
        ...BLANK,
        ...Object.fromEntries(Object.entries(asset).map(([k, v]) => [k, v ?? ''])),
        team_id: asset.team_id || '',
        status: asset.status || 'disponivel',
        // o campo virou sim/não: qualquer valor antigo significa que tem o GPS
        samsung: yesNo(asset.samsung),
      });
    } else {
      setForm({ ...BLANK, team_id: defaultTeamId || '', tipo: categories[0]?.name || '' });
    }
  }, [open, asset, defaultTeamId, categories]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const preview = oilStatus({
    oil_interval: form.oil_interval,
    last_oil_odometer: form.last_oil_odometer,
    odometer: form.odometer,
  });

  function addEntry() {
    if (!entry.date) return;
    setEntries((prev) => [...prev, entry]);
    setEntry(BLANK_ENTRY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const numeric = (v) => (v === '' || v === null ? null : Number(v));
      await onSubmit(
        {
          ...form,
          name: form.name.trim(),
          team_id: form.team_id || null,
          odometer: numeric(form.odometer),
          oil_interval: numeric(form.oil_interval),
          last_oil_odometer: numeric(form.last_oil_odometer),
          last_oil_date: form.last_oil_date || null,
        },
        entries.map((en) => ({
          type: en.type,
          partName: en.partName.trim() || MAINTENANCE_TYPES[en.type].label,
          quantity: 1,
          date: en.date,
          odometer: en.odometer === '' ? null : Number(en.odometer),
          notes: en.notes.trim() || null,
        }))
      );
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
      maxWidth={620}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <Section title="Identificação">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome / Código" span>
              <input required value={form.name} onChange={set('name')} placeholder="Ex: TRK-034" className="input-apple" />
            </Field>
            <Field label="Categoria">
              {categories.length === 0 ? (
                <input
                  value={form.tipo}
                  onChange={set('tipo')}
                  placeholder="Ex: Truck (cadastre em Categorias)"
                  className="input-apple"
                />
              ) : (
                <select value={form.tipo} onChange={set('tipo')} className="input-apple">
                  <option value="">— Sem categoria —</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  {form.tipo && !categories.some((c) => c.name === form.tipo) && (
                    <option value={form.tipo}>{form.tipo}</option>
                  )}
                </select>
              )}
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
                <option value="">Yard (sem equipe)</option>
                <TeamOptions teams={teams} />
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
            <Field label="Motorista / operador">
              <input value={form.driver} onChange={set('driver')} placeholder="Ex: João Pereira" className="input-apple" />
            </Field>
            <Field label="Proprietário">
              <input value={form.owner} onChange={set('owner')} placeholder="Ex: Power Connect USA" className="input-apple" />
            </Field>
            <Field label="Cidade">
              <input value={form.city} onChange={set('city')} placeholder="Ex: Apopka" className="input-apple" />
            </Field>
            <Field label="Estado">
              <input value={form.state} onChange={set('state')} placeholder="Ex: FL" className="input-apple" />
            </Field>
          </div>
        </Section>

        <Section title="Troca de óleo">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Odômetro atual">
              <input type="number" min="0" value={form.odometer} onChange={set('odometer')} placeholder="Ex: 84200" className="input-apple" />
            </Field>
            <Field label="Trocar a cada">
              <input type="number" min="0" value={form.oil_interval} onChange={set('oil_interval')} placeholder="Ex: 5000" className="input-apple" />
            </Field>
            <Field label="Odômetro da última troca">
              <input type="number" min="0" value={form.last_oil_odometer} onChange={set('last_oil_odometer')} placeholder="Ex: 81000" className="input-apple" />
            </Field>
            <Field label="Data da última troca">
              <input type="date" value={form.last_oil_date} onChange={set('last_oil_date')} className="input-apple" />
            </Field>
          </div>
          <div
            className="mt-3 rounded-lg px-3.5 py-2.5 text-[12.5px]"
            style={{
              background: preview.configured ? 'var(--accent-soft)' : 'var(--bg-secondary)',
              color: preview.configured ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {preview.configured
              ? <>Próxima troca aos <strong>{fmtNum(preview.next)}</strong>{preview.remaining != null && ` · ${preview.label}`}</>
              : 'Preencha intervalo e odômetro da última troca para o sistema avisar a próxima.'}
          </div>
        </Section>

        {!isEdit && (
          <Section title="Manutenções que este equipamento já teve">
            {entries.length > 0 && (
              <div className="card mb-3 row-divide overflow-hidden">
                {entries.map((en, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                        {MAINTENANCE_TYPES[en.type].label}
                        {en.partName ? ` · ${en.partName}` : ''}
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {fmtDate(en.date)}{en.odometer ? ` · ${fmtNum(en.odometer)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEntries((prev) => prev.filter((_, i) => i !== idx))}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                      style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
                      aria-label="Remover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select value={entry.type} onChange={(e) => setEntry((s) => ({ ...s, type: e.target.value }))} className="input-apple">
                  {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Data">
                <input type="date" value={entry.date} onChange={(e) => setEntry((s) => ({ ...s, date: e.target.value }))} className="input-apple" />
              </Field>
              <Field label="Descrição">
                <input value={entry.partName} onChange={(e) => setEntry((s) => ({ ...s, partName: e.target.value }))} placeholder="Ex: Óleo 15W40" className="input-apple" />
              </Field>
              <Field label="Odômetro">
                <input type="number" min="0" value={entry.odometer} onChange={(e) => setEntry((s) => ({ ...s, odometer: e.target.value }))} placeholder="Ex: 81000" className="input-apple" />
              </Field>
            </div>
            <button
              type="button"
              onClick={addEntry}
              disabled={!entry.date}
              className="btn-ghost mt-3 flex w-full items-center justify-center gap-2 py-2 text-[13px] disabled:opacity-40"
            >
              <Plus size={14} /> Adicionar ao histórico
            </button>
          </Section>
        )}

        <Section title="Rastreamento & dispositivos">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Verizon">
              <input value={form.verizon} onChange={set('verizon')} placeholder="Linha / IMEI" className="input-apple" />
            </Field>
            <Field label="Bouncie">
              <input value={form.bouncie} onChange={set('bouncie')} placeholder="ID do rastreador" className="input-apple" />
            </Field>
            <Field label="Samsung (GPS)">
              <select value={form.samsung} onChange={set('samsung')} className="input-apple">
                <option value="">—</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
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
