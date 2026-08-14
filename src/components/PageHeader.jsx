export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
