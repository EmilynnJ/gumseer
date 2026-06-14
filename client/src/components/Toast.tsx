import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; message: string; type: ToastType; }
interface ToastContextType { addToast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });
let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} style={{ padding: "12px 20px", borderRadius: 8, color: "#fff", fontWeight: 600, animation: "slideIn 0.3s ease", maxWidth: 320, background: t.type === "error" ? "#EF4444" : t.type === "success" ? "#22C55E" : "#3B82F6", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
