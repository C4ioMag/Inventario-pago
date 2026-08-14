export default function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && <Icon size={30} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />}
      <p className="mt-3.5 text-[14.5px] font-medium" style={{ color: 'var(--text)' }}>{title}</p>
      {hint && <p className="mt-1 max-w-[340px] text-[13px]" style={{ color: 'var(--text-secondary)' }}>{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
