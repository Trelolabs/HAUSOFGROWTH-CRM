import Bull from 'bull'
import { env } from '../config/env'

export const smsQueue = new Bull('sms-campaign', {
  redis: env.REDIS_URL
    ? env.REDIS_URL
    : { host: env.REDIS_HOST, port: env.REDIS_PORT, maxRetriesPerRequest: null, enableReadyCheck: false },
  limiter: { max: 5, duration: 1000 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})
