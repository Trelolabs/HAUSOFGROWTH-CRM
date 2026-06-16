import Redis from 'ioredis'
import { env } from './env'

export const redisClient = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false })
  : new Redis({ host: env.REDIS_HOST, port: env.REDIS_PORT, maxRetriesPerRequest: null, enableReadyCheck: false })

redisClient.on('connect', () => {
  console.log('✅ Redis connected')
})

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err.message)
})
