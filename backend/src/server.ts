import './config/env'
import app from './app'
import { env } from './config/env'
import { prisma } from './config/db'
import { redisClient } from './config/redis'

// Register Bull workers (side-effectful imports that call queue.process())
import './workers/email.worker'
import './workers/sms.worker'

const server = app.listen(env.PORT, () => {
  console.log(`🚀 CRM Backend running on port ${env.PORT} [${env.NODE_ENV}]`)
})

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`)

  server.close(async () => {
    await prisma.$disconnect()
    await redisClient.quit()
    console.log('✅ Graceful shutdown complete')
    process.exit(0)
  })

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout')
    process.exit(1)
  }, 10_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})

export default server
