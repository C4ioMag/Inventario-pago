import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const easeOut = [0.16, 1, 0.3, 1];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    if (!login(email, password)) {
      setError('Email ou senha incorretos.');
      setShake((s) => s + 1);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 55% 45% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 55% 45% at 50% 40%, black, transparent)',
        }}
      />

      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="relative w-full max-w-[360px]"
      >
        <div className="card p-8">
          <div className="mb-7 text-center">
            <div
              className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #1E40AF 100%)' }}
            >
              <ClipboardList size={20} color="#fff" strokeWidth={2.2} />
            </div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Inventário
            </h1>
            <p className="mt-1.5 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
              Power Connect USA
            </p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-3.5"
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-apple"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-apple pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[12.5px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-1 w-full py-2.5 text-[14px]">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
}
