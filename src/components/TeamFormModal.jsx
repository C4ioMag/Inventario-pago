import { useEffect, useState } from 'react';
import Modal from './Modal';
import { teamLabel } from '../lib/teams';

export default function TeamFormModal({ open, onClose, onSubmit, team }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(team);

  useEffect(() => {
    if (!open) return;
    setName(team?.name || '');
    setCode(team?.code || '');
    setSupervisor(team?.supervisor || '');
  }, [open, team]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim() || null,
        supervisor: supervisor.trim() || null,
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
      title={isEdit ? 'Editar equipe' : 'Nova equipe'}
      subtitle={isEdit ? team?.name : 'Grupo para organizar equipamentos e estoque'}
      maxWidth={420}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nome da equipe
          </label>
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Caio" className="input-apple" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Código no sistema (opcional)
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: PC-038"
            className="input-apple uppercase"
          />
          <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            {name.trim() || code.trim()
              ? <>A equipe vai aparecer como <strong>{teamLabel({ name: name.trim() || '—', code: code.trim() })}</strong>.</>
              : 'Use o mesmo código do sistema — planilhas e PDFs também são casados por ele.'}
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Supervisor
          </label>
          <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Ex: Felipe Donato" className="input-apple" />
        </div>
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar equipe'}
        </button>
      </form>
    </Modal>
  );
}
