// 优化的日志工具
// 在生产环境中禁用日志，在开发环境中提供结构化日志

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private static instance: Logger;
  private isDev = process.env.NODE_ENV === 'development';
  private logLevel = this.isDev ? LogLevel.DEBUG : LogLevel.ERROR;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (level < this.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] ${levelStr}:`, message, ...args);
        break;
      case LogLevel.INFO:
        console.info(`[${timestamp}] ${levelStr}:`, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] ${levelStr}:`, message, ...args);
        break;
      case LogLevel.ERROR:
        console.error(`[${timestamp}] ${levelStr}:`, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }

  // 性能监控工具
  time(label: string) {
    if (this.isDev) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.isDev) {
      console.timeEnd(label);
    }
  }

  // 分组日志
  group(label: string) {
    if (this.isDev) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isDev) {
      console.groupEnd();
    }
  }
}

export const logger = Logger.getInstance();

// 便捷方法
export const log = {
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
}; 