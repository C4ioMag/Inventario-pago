import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 420 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="surface relative w-full rounded-[18px] p-6"
            style={{ maxWidth, boxShadow: 'var(--shadow-modal)' }}
          >
            <button
              onClick={onClose}
              className="btn-ghost absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
            {title && (
              <div className="mb-5 pr-8">
                <h2 className="text-[19px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h2>
                {subtitle && <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
