import { useState } from 'react';
import Modal from './Modal';

export default function CreateTeamModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(name.trim());
      setName('');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova equipe" subtitle="Crie um grupo para organizar veículos e estoque">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="label-caps mb-2 ml-0.5 block">Nome da equipe</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Abenamar"
            className="input-apple"
          />
        </div>
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary mt-2 w-full py-3 text-[15px]">
          {saving ? 'Criando…' : 'Criar equipe'}
        </button>
      </form>
    </Modal>
  );
}
