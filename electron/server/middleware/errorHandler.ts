// 에러 핸들러 미들웨어

import { Request, Response, NextFunction } from 'express';

// 커스텀 에러 클래스
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 에러 핸들러
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('요청한 리소스를 찾을 수 없습니다.', 404));
}

// 전역 에러 핸들러
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 기본값
  let statusCode = 500;
  let message = '서버 내부 오류가 발생했습니다.';

  // AppError인 경우
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message) {
    // 일반 에러 (비즈니스 로직에서 던진 에러)
    statusCode = 400;
    message = err.message;
  }

  // 개발 환경에서만 스택 트레이스 출력
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
