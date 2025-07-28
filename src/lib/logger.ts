import winston from 'winston'

const isDevelopment = process.env.NODE_ENV === 'development'

// Configure Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isDevelopment
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      : winston.format.json()
  ),
  defaultMeta: {
    service: 'lha-donate-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error']
    })
  ]
})

// Helper functions for structured logging
export const logRequest = (method: string, path: string, requestId?: string, userId?: string) => {
  logger.info('API Request', {
    method,
    path,
    requestId,
    userId,
    type: 'request'
  })
}

export const logResponse = (method: string, path: string, status: number, duration: number, requestId?: string, userId?: string) => {
  logger.info('API Response', {
    method,
    path,
    status,
    duration: `${duration}ms`,
    requestId,
    userId,
    type: 'response'
  })
}

export const logError = (message: string, error: Error, context?: Record<string, unknown>) => {
  logger.error(message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context,
    type: 'error'
  })
}

export const logDatabaseQuery = (query: string, duration?: number, requestId?: string) => {
  logger.debug('Database Query', {
    query: query.substring(0, 200), // Truncate long queries
    duration: duration ? `${duration}ms` : undefined,
    requestId,
    type: 'database'
  })
}

export const logSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, unknown>) => {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn'
  logger.log(level, 'Security Event', {
    event,
    severity,
    ...metadata,
    type: 'security'
  })
}