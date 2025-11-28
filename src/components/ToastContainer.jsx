// ToastContainer.jsx - Fixed container for stacking toasts
import Toast from "./Toast";

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  // Deduplicate toasts by type+message (keep the latest of each unique message)
  const uniqueMap = new Map();
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i];
    const key = `${t.type}::${t.message}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, t);
  }

  // Restore order (oldest first)
  const uniqueToasts = Array.from(uniqueMap.values()).reverse();

  // Limit visible toasts to avoid UI overload
  const MAX_VISIBLE = 3;
  const visibleToasts = uniqueToasts.slice(-MAX_VISIBLE);

  return (
    <>
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
        {visibleToasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={onDismiss}
            duration={toast.duration}
          />
        ))}
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ToastContainer;
