import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Package } from 'lucide-react';
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
    await new Promise((r) => setTimeout(r, 450));
    if (!login(email, password)) {
      setError('Email ou senha incorretos.');
      setShake((s) => s + 1);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" style={{ background: 'var(--bg)' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="aurora-blob"
          style={{ top: '-14rem', right: '-10rem', width: '34rem', height: '34rem', background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)' }}
        />
        <div
          className="aurora-blob"
          style={{ bottom: '-16rem', left: '-12rem', width: '30rem', height: '30rem', background: 'radial-gradient(circle, rgba(94,92,230,0.14) 0%, transparent 70%)', animationDelay: '-8s' }}
        />
        <div
          className="aurora-blob"
          style={{ top: '30%', left: '50%', width: '20rem', height: '20rem', background: 'radial-gradient(circle, var(--success-soft) 0%, transparent 70%)', animationDelay: '-15s' }}
        />
      </div>

      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="relative w-full max-w-[380px]"
      >
        <div className="surface rounded-[28px] p-9" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[20px]"
            style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #0040DD 100%)', boxShadow: '0 10px 30px var(--accent-soft)' }}
          >
            <Package size={28} color="white" strokeWidth={2.2} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
            className="mb-8 text-center"
          >
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Bem-vindo de volta</h1>
            <p className="mt-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Entre para gerenciar seu estoque</p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-3.5"
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28, ease: easeOut }}>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Email</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input-apple pl-10"
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.34, ease: easeOut }}>
              <label className="mb-1.5 ml-0.5 block text-[13px] font-medium" style={{ color: 'var(--text)' }}>Senha</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-apple pl-10 pr-10"
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl px-4 py-2.5"
                style={{ background: 'var(--danger-soft)' }}
              >
                <p className="text-[13px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: easeOut }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 w-full py-3 text-[15px]"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </motion.button>
          </motion.form>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 text-center text-[12px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Power Connect USA · Controle de Estoque
        </motion.p>
      </motion.div>
    </div>
  );
}
