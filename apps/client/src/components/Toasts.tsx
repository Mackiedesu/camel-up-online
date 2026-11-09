import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.kind}`}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <strong>{t.text}</strong>
            {t.lines && (
              <div className="toast-lines">
                {t.lines.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
