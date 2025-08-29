import { useAppStore } from '../store/appStore';

export const useErrorHandler = () => {
  const setError = useAppStore((state) => state.setError);

  return (error: Error, errorInfo?: string) => {
    console.error('Error caught by useErrorHandler:', error);

    setError({
      code: 'HANDLED_ERROR',
      message: error.message,
      details: {
        stack: error.stack,
        info: errorInfo,
      },
      timestamp: Date.now(),
    });
  };
};
