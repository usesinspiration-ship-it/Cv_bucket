import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { HttpError } from '../utils/httpError.js'

export function notFound(_request: Request, _response: Response, next: NextFunction) {
  next(new HttpError(404, 'Route not found.'))
}

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  void _next

  if (error.name === 'MulterError') {
    response.status(400).json({
      message: error.message,
    })
    return
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      message: error.issues.map((issue) => issue.message).join(', '),
    })
    return
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      message: error.message,
    })
    return
  }

  console.error(error)

  response.status(500).json({
    message:
      env.NODE_ENV === 'development'
        ? error.message || 'Unexpected server error.'
        : 'Unexpected server error.',
    ...(env.NODE_ENV === 'development' && error.stack ? { stack: error.stack } : {}),
  })
}
