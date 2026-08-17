import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { MAINTENANCE_TYPES } from '../lib/maintenance';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const BLANK = {
  vehicle: '',
  type: 'manutencao',
  status: 'em_andamento',
  date: today(),
  finishedDate: '',
  workDone: '',
  partsUsed: '',
  mechanic: '',
  odometer: '',
  cost: '',
};

/**
 * Registro de manutenção em campo aberto.
 *
 * O veículo é digitado (com sugestão dos já cadastrados) e, se ainda não
 * existir, é criado na hora. O texto do serviço é livre — descrever peças é
 * opcional.
 */
export default function WorkOrderModal({ open, onClose, onSubmit, assets = [], entry = null, defaultAssetId = null }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(entry);

  const assetName = useMemo(() => {
    const map = new Map(assets.map((a) => [a.id, a.name]));
    return (id) => map.get(id) || '';
  }, [assets]);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setForm({
        vehicle: assetName(entry.asset_id),
        type: entry.type || 'manutencao',
        status: entry.status || 'concluido',
        date: entry.date || today(),
        finishedDate: entry.finished_date || '',
        workDone: entry.work_done || entry.part_name || '',
        partsUsed: entry.parts_used || '',
        mechanic: entry.mechanic || entry.details?.shop || '',
        odometer: entry.odometer ?? '',
        cost: entry.cost ?? '',
      });
    } else {
      setForm({ ...BLANK, date: today(), vehicle: defaultAssetId ? assetName(defaultAssetId) : '' });
    }
  }, [open, entry, defaultAssetId, assetName]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const typedVehicle = form.vehicle.trim();
  const matched = assets.find((a) => (a.name || '').trim().toLowerCase() === typedVehicle.toLowerCase());
  const willCreate = Boolean(typedVehicle) && !matched;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!typedVehicle || !form.workDone.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        vehicle: typedVehicle,
        assetId: matched?.id || null,
        type: form.type,
        status: form.status,
        date: form.date,
        finishedDate: form.status === 'concluido' ? (form.finishedDate || form.date) : null,
        workDone: form.workDone.trim(),
        partsUsed: form.partsUsed.trim() || null,
        mechanic: form.mechanic.trim() || null,
        odometer: form.odometer === '' ? null : Number(form.odometer),
        cost: form.cost === '' ? null : Number(form.cost),
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
      title={isEdit ? 'Editar manutenção' : 'Registrar manutenção'}
      subtitle="Escreva o veículo e o que foi feito — o registro fica no histórico dele"
      maxWidth={580}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Veículo / equipamento">
          <input
            required
            list="workorder-assets"
            value={form.vehicle}
            onChange={set('vehicle')}
            placeholder="Digite ou escolha — ex: TRK-034"
            className="input-apple"
            autoComplete="off"
          />
          <datalist id="workorder-assets">
            {assets.map((a) => (
              <option key={a.id} value={a.name}>
                {[a.tipo, a.plate, a.vin].filter(Boolean).join(' · ')}
              </option>
            ))}
          </datalist>
          {willCreate && (
            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--warn)' }}>
              “{typedVehicle}” ainda não está cadastrado — será criado automaticamente.
            </p>
          )}
          {matched && (
            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              {[matched.tipo, matched.model, matched.plate, matched.vin].filter(Boolean).join(' · ') || 'Equipamento cadastrado'}
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Situação">
            <select value={form.status} onChange={set('status')} className="input-apple">
              <option value="em_andamento">Em manutenção</option>
              <option value="concluido">Pronto / concluído</option>
            </select>
          </Field>
          <Field label="Tipo de serviço">
            <select value={form.type} onChange={set('type')} className="input-apple">
              {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="O que foi feito na manutenção">
          <textarea
            required
            rows={5}
            value={form.workDone}
            onChange={set('workDone')}
            placeholder={'Campo aberto — escreva à vontade.\nEx: Trocado o cilindro do braço hidráulico, sangrado o sistema e testado com carga.'}
            className="input-apple resize-y"
          />
        </Field>

        <Field label="Peças usadas (opcional)">
          <textarea
            rows={3}
            value={form.partsUsed}
            onChange={set('partsUsed')}
            placeholder="Ex: 2x mangueira 1/2 · filtro hidráulico HF6553 · 4 L de óleo AW46"
            className="input-apple resize-y"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mecânico / oficina">
            <input value={form.mechanic} onChange={set('mechanic')} placeholder="Quem executou" className="input-apple" />
          </Field>
          <Field label="Odômetro / horímetro">
            <input type="number" min="0" value={form.odometer} onChange={set('odometer')} placeholder="Ex: 84200" className="input-apple" />
          </Field>
          <Field label={form.status === 'concluido' ? 'Data de entrada' : 'Entrou em manutenção em'}>
            <input type="date" required value={form.date} onChange={set('date')} className="input-apple" />
          </Field>
          {form.status === 'concluido' ? (
            <Field label="Data de conclusão">
              <input type="date" value={form.finishedDate} onChange={set('finishedDate')} className="input-apple" />
            </Field>
          ) : (
            <Field label="Custo (opcional)">
              <input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} placeholder="0.00" className="input-apple" />
            </Field>
          )}
          {form.status === 'concluido' && (
            <Field label="Custo (opcional)" span>
              <input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} placeholder="0.00" className="input-apple" />
            </Field>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !typedVehicle || !form.workDone.trim()}
          className="btn-primary w-full py-2.5 text-[14px] disabled:opacity-50"
        >
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Salvar manutenção'}
        </button>
      </form>
    </Modal>
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
