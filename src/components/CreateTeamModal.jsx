import { useEffect, useState } from 'react';
import Modal from './Modal';

export default function CreateTeamModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(''); setSupervisor(''); }
  }, [open]);

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
    <Modal open={open} onClose={onClose} title="Nova equipe" subtitle="Grupo para organizar equipamentos e estoque">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Nome da equipe</label>
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Abenamar" className="input-apple" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Supervisor (opcional)</label>
          <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Ex: Felipe Donato" className="input-apple" />
        </div>
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Criando…' : 'Criar equipe'}
        </button>
      </form>
    </Modal>
  );
}
