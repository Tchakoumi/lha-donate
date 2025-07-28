import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, logRequest, logResponse, logError } from '@/lib/logger'

export async function GET() {
  const requestId = Math.random().toString(36).substring(7)
  const start = Date.now()
  
  try {
    logRequest('GET', '/api/health', requestId)
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    logger.debug('Database health check passed', { requestId })
    
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      service: 'lha-donate-api',
      version: process.env.npm_package_version || '1.0.0'
    }
    
    const duration = Date.now() - start
    logResponse('GET', '/api/health', 200, duration, requestId)
    
    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - start
    logError('Health check failed', error as Error, { 
      method: 'GET', 
      path: '/api/health', 
      requestId,
      operation: 'database_health_check'
    })
    
    const response = {
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      service: 'lha-donate-api',
      error: 'Database connection failed'
    }
    
    logResponse('GET', '/api/health', 503, duration, requestId)
    
    return NextResponse.json(response, { status: 503 })
  }
}