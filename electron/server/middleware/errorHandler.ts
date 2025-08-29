import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (error: AppError, req: Request, res: Response, _next: NextFunction): void => {
  // Express 에러 미들웨어 시그니처 유지 목적의 인자 사용 처리
  void _next;
  const statusCode = error.statusCode || 500;
  const message = error.message || '내부 서버 오류가 발생했습니다';

  // 오류 로깅
  logger.error('서버 오류', {
    message: error.message,
    stack: error.stack,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 클라이언트에게 응답
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => unknown) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
