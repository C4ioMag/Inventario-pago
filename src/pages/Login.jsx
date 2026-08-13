import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
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
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent)',
        }}
      />
      <div
        className="slow-drift pointer-events-none fixed left-1/2 top-[18%] h-[420px] w-[620px] -translate-x-1/2 rounded-full"
        style={{ background: 'var(--accent-soft)', filter: 'blur(80px)' }}
      />

      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative w-full max-w-[340px]"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-10 text-center"
        >
          <div className="mb-5 flex justify-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[12px] text-[15px] font-bold"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}
            >
              PC
            </div>
          </div>
          <h1 className="text-[32px] font-bold leading-none" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Estoque
          </h1>
          <p className="mt-2.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            Power Connect USA
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-3"
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15, ease: easeOut }}>
            <label className="label-caps mb-2 ml-0.5 block">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="input-apple"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: easeOut }}>
            <label className="label-caps mb-2 ml-0.5 block">Senha</label>
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </motion.div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-[13px] font-medium"
              style={{ color: 'var(--danger)' }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: easeOut }}
            type="submit"
            disabled={loading}
            className="btn-primary mt-3 w-full py-3 text-[15px]"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
