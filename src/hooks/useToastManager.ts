import { useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

export const useToastManager = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    if (!toast.persistent) {
      setTimeout(() => {
        removeToast(newToast.id);
      }, toast.duration || 4000);
    }
  };

  const clearAll = () => setToasts([]);

  return { toasts, addToast, removeToast, clearAll };
};
