import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { errorMiddleware } from './middleware/error.middleware'
import { ApiError } from './utils/ApiError'
import router from './routes/index'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(compression() as express.RequestHandler)

if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { success: false, message: 'Too many requests', code: 'RATE_LIMITED' },
// })

// app.use('/api', limiter)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: 'OK' })
})

app.use('/api', router)

app.use((_req, _res, next) => {
  next(ApiError.notFound('Route not found'))
})

app.use(errorMiddleware)

export default app
