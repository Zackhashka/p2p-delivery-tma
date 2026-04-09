export class AppError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 'CONFLICT', 409);
  }
}

/**
 * Global error handler for Fastify
 */
export async function errorHandler(error, request, reply) {
  console.error('[ERROR]', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    url: request.url,
    method: request.method,
    stack: error.stack
  });

  // Handle Prisma known request errors
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'unknown';
    return reply.code(409).send({
      error: 'Conflict',
      code: 'DUPLICATE_KEY',
      field,
      message: `${field} already exists`
    });
  }

  // Handle Prisma not found
  if (error.code === 'P2025') {
    return reply.code(404).send({
      error: 'Record not found',
      code: 'NOT_FOUND'
    });
  }

  // Handle Prisma invalid ID / foreign key
  if (error.code === 'P2003' || error.code === 'P2023') {
    return reply.code(400).send({
      error: 'Invalid reference or ID format',
      code: 'INVALID_ID'
    });
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.message,
      code: error.code
    });
  }

  // Default error response
  return reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
    code: error.code || 'INTERNAL_ERROR'
  });
}
