import { ErrorRequestHandler } from 'express';
import AppError from '../errors/AppError';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorMessages: { path: string | number; message: string }[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorMessages = err.message ? [{ path: '', message: err.message }] : [];
  } else if (err instanceof Error) {
    message = err.message;
    errorMessages = err.message ? [{ path: '', message: err.message }] : [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
};

export default globalErrorHandler;
