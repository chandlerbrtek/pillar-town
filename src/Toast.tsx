import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastData {
  id: number;
  content: ReactNode;
  action?: { label: string; run: () => void };
}

const ToastContext = createContext<(t: Omit<ToastData, 'id'>) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((t: Omit<ToastData, 'id'>) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" key={toast.id} role="status">
          <div className="toast-content">{toast.content}</div>
          {toast.action && (
            <button
              className="toast-action"
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
