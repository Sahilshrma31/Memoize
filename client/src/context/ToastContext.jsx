import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

const DEFAULT_DURATION_MS = 2800;

const VARIANT_CLS = {
  success: 'border-rating-good text-rating-good',
  error: 'border-rating-blackout text-rating-blackout',
  // Rewards: XP pops and achievement unlocks carry their own inner layout.
  xp: 'border-accent-orange text-midnight-text',
  achievement: 'border-[#e8c35a] text-midnight-text bg-[#e8c35a]/[0.06]',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // `message` may be a string or a React node.
  const showToast = useCallback((message, variant = 'success', duration = DEFAULT_DURATION_MS) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Top-right, under the header: at the bottom they covered the rating
          buttons mid-review. */}
      <div className="fixed top-20 right-5 left-5 sm:left-auto z-50 flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto max-w-sm border-l-2 bg-midnight-surface px-4 py-2.5 text-sm shadow-lg font-mono animate-[popIn_0.25s_ease-out] ${
              VARIANT_CLS[t.variant] || VARIANT_CLS.success
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
