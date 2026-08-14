import { motion } from 'framer-motion';

/** Sparkline em SVG puro — sem libs, escala automática. */
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div className="h-[42px]" />;
  const w = 260;
  const h = 42;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / span) * (h - 6) - 3]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[42px] w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)', trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <p className="label-caps">{label}</p>
          <p
            className="mt-2 text-[28px] font-bold leading-none tabular-nums"
            style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
          >
            {value}
          </p>
          <p className="mt-1.5 truncate text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
        >
          <Icon size={17} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-1">
        <Sparkline data={trend} color={color} />
      </div>
    </motion.div>
  );
}
