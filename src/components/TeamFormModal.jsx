import { useEffect, useState } from 'react';
import Modal from './Modal';

export default function TeamFormModal({ open, onClose, onSubmit, team }) {
  const [name, setName] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(team);

  useEffect(() => {
    if (!open) return;
    setName(team?.name || '');
    setSupervisor(team?.supervisor || '');
  }, [open, team]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), supervisor: supervisor.trim() || null });
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
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Abenamar" className="input-apple" />
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
