import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className="relative flex h-9 w-16 items-center rounded-full transition-colors duration-300"
      style={{ background: isDark ? 'var(--bg-secondary)' : 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <span
        className="absolute top-[3px] flex h-[26px] w-[26px] items-center justify-center rounded-full transition-all duration-300 ease-out"
        style={{
          left: isDark ? '33px' : '3px',
          background: isDark ? '#1C1C1E' : '#FFFFFF',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        }}
      >
        {isDark ? <Moon size={13} color="#F5C518" /> : <Sun size={13} color="#FF9F0A" />}
      </span>
    </button>
  );
}
