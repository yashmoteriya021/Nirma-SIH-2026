/**
 * Consistent API response helpers.
 * Every endpoint uses these to guarantee the { success, data/error, message } envelope.
 */

export const successResponse = (res, data = {}, message = '', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const errorResponse = (res, code, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

/**
 * Custom API error class that carries an error code and HTTP status.
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}
