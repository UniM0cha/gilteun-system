/**
 * 길튼 시스템 로거
 * 간단한 콘솔 로깅 유틸리티
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : minLevel;
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (level < this.minLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const prefix = `[${timestamp}] [${levelName}]`;

    const logMethod = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
    }[level];

    if (meta) {
      logMethod(`${prefix} ${message}`, meta);
    } else {
      logMethod(`${prefix} ${message}`);
    }
  }

  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, message, meta);
  }
}

export const logger = new Logger();
