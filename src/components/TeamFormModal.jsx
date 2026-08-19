import { useEffect, useState } from 'react';
import Modal from './Modal';
import { TEAM_KINDS, teamLabel } from '../lib/teams';

export default function TeamFormModal({ open, onClose, onSubmit, team, defaultKind = 'equipe' }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [kind, setKind] = useState('equipe');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(team);

  useEffect(() => {
    if (!open) return;
    setName(team?.name || '');
    setCode(team?.code || '');
    setSupervisor(team?.supervisor || '');
    setKind(team?.kind || defaultKind);
  }, [open, team, defaultKind]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim() || null,
        kind,
        supervisor: kind === 'supervisor' ? null : supervisor.trim() || null,
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
      title={isEdit ? `Editar ${TEAM_KINDS[kind].label.toLowerCase()}` : `Nov${kind === 'equipe' ? 'a' : 'o'} ${TEAM_KINDS[kind].label.toLowerCase()}`}
      subtitle={isEdit ? team?.name : 'Equipamentos e estoque ficam guardados no nome dele'}
      maxWidth={420}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Supervisor também tem equipamento no nome dele — muda o rótulo, não o funcionamento */}
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
          {Object.values(TEAM_KINDS).map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className="flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
              style={{
                background: kind === k.value ? 'var(--bg-elevated)' : 'transparent',
                color: kind === k.value ? 'var(--text)' : 'var(--text-secondary)',
                boxShadow: kind === k.value ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {kind === 'supervisor' ? 'Nome do supervisor' : 'Nome da equipe'}
          </label>
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'supervisor' ? 'Ex: Felipe Donato' : 'Ex: Caio'} className="input-apple" />
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
        {kind === 'equipe' && (
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Supervisor responsável
            </label>
            <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Ex: Felipe Donato" className="input-apple" />
          </div>
        )}
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full py-2.5 text-[14px]">
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : `Criar ${TEAM_KINDS[kind].label.toLowerCase()}`}
        </button>
      </form>
    </Modal>
  );
}
