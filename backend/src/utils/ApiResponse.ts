export interface Meta {
  total: number
  page: number
  limit: number
  totalPages?: number
}

export interface SuccessResponse<T> {
  success: true
  data: T
  meta?: Meta
}

export interface ErrorResponse {
  success: false
  message: string
  code: string
  errors?: unknown[]
}

export function successResponse<T>(data: T, meta?: Meta): SuccessResponse<T> {
  return { success: true, data, ...(meta && { meta }) }
}

export function errorResponse(
  message: string,
  code: string,
  errors?: unknown[]
): ErrorResponse {
  return { success: false, message, code, ...(errors && { errors }) }
}

export function paginationMeta(total: number, page: number, limit: number): Meta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}
