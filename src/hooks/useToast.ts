// 토스트 훅 (react-toastify 래퍼)

import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export interface ToastContextType {
  toast: (title: string, options?: ToastOptions) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export function useToast(): ToastContextType {
  const showToast = (title: string, options?: ToastOptions) => {
    toast(title, { ...defaultOptions, ...options });
  };

  const success = (title: string, message?: string) => {
    const content = message ? `${title}\n${message}` : title;
    toast.success(content, defaultOptions);
  };

  const error = (title: string, message?: string) => {
    const content = message ? `${title}\n${message}` : title;
    toast.error(content, defaultOptions);
  };

  const warning = (title: string, message?: string) => {
    const content = message ? `${title}\n${message}` : title;
    toast.warning(content, defaultOptions);
  };

  const info = (title: string, message?: string) => {
    const content = message ? `${title}\n${message}` : title;
    toast.info(content, defaultOptions);
  };

  return {
    toast: showToast,
    success,
    error,
    warning,
    info,
  };
}
