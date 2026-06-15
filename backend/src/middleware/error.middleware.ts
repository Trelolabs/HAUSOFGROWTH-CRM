import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError'
import { errorResponse } from '../utils/ApiResponse'

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(
      errorResponse(err.message, err.code, err.errors.length ? err.errors : undefined)
    )
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json(
      errorResponse(
        'Validation failed',
        'VALIDATION_ERROR',
        err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      )
    )
    return
  }

  const isDev = process.env.NODE_ENV === 'development'
  const message = err instanceof Error ? err.message : 'An unexpected error occurred'

  console.error('[Unhandled Error]', err)

  res.status(500).json(
    errorResponse(
      isDev ? message : 'Internal server error',
      'INTERNAL_ERROR',
      isDev && err instanceof Error ? [{ stack: err.stack }] : undefined
    )
  )
}
