export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly errors: unknown[]

  constructor(
    statusCode: number,
    message: string,
    code: string = 'INTERNAL_ERROR',
    errors: unknown[] = []
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.errors = errors
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static badRequest(message: string, errors?: unknown[]) {
    return new ApiError(400, message, 'BAD_REQUEST', errors)
  }

  static notFound(message: string = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND')
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_ERROR')
  }

  static validation(message: string, errors: unknown[]) {
    return new ApiError(400, message, 'VALIDATION_ERROR', errors)
  }

  static conflict(message: string) {
    return new ApiError(409, message, 'CONFLICT')
  }
}
