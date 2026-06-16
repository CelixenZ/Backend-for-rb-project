import ApiError from "../shared/utils/apiError";

const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log for developer
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Handle Prisma Specific Errors
  if (err.code === 'P2002') {
    // Unique constraint violation
    const target = err.meta?.target || 'field';
    error = new ApiError(400, `The provided ${target} is already in use. Please use a unique value.`);
  }

  if (err.code === 'P2003') {
    // Foreign key constraint violation
    const field = err.meta?.field_name || 'referenced record';
    error = new ApiError(400, `Cannot perform this action because the ${field} does not exist or is still linked to other data.`);
  }

  if (err.code === 'P2025') {
    // Record not found
    error = new ApiError(404, err.meta?.cause || 'The requested record could not be found.');
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => {
      const msg: any = val;
      return msg.message;
    });
    error = new ApiError(400, message.join(', '));
  }

  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid security token. Please log in again.');
  }

  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    errorCode: err.code || undefined
  });
};

export default errorMiddleware;
