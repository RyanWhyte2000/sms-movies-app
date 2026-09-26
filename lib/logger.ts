type LogLevel = "debug" | "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

const sensitiveKey = /authorization|cookie|credential|csrf|email|password|secret|session|token/i;

function sanitize(context: LogContext): Record<string, LogValue | "[REDACTED]"> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(context),
  };
  const message = `[sms-movies] ${JSON.stringify(record)}`;

  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else if (level === "info") console.info(message);
  else if (process.env.NODE_ENV !== "production") console.debug(message);
}

export const logger = {
  debug: (event: string, context?: LogContext) => write("debug", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
