type Level = 'debug' | 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { message: String(error) }
}

function replacer(_key: string, value: unknown) {
  if (value instanceof Error) return serializeError(value)
  if (typeof value === 'bigint') return value.toString()
  return value
}

function write(level: Level, logger: string, message: string, fields?: Fields, error?: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    logger,
    message,
    ...fields,
    ...(error === undefined ? {} : { error: serializeError(error) }),
  }

  let line: string
  try {
    line = JSON.stringify(entry, replacer)
  } catch {
    line = JSON.stringify({ timestamp: entry.timestamp, level, logger, message })
  }

  if (level === 'error') {
    process.stderr.write(`${line}\n`)
  } else {
    process.stdout.write(`${line}\n`)
  }
}

export function createLogger(name: string) {
  return {
    debug: (message: string, fields?: Fields) => write('debug', name, message, fields),
    info: (message: string, fields?: Fields) => write('info', name, message, fields),
    warn: (message: string, fields?: Fields, error?: unknown) => write('warn', name, message, fields, error),
    error: (message: string, fields?: Fields, error?: unknown) => write('error', name, message, fields, error),
  }
}

export type Logger = ReturnType<typeof createLogger>
