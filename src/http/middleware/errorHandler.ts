import { type Request, type Response, type NextFunction } from 'express';
import { jsonError } from '../utils/responseUtils';

export const notFoundHandler = (_req: Request, res: Response) => {
  return jsonError(res, 404, 'BAD_REQUEST', 'Route not found');
};

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return jsonError(res, 500, 'INTERNAL', msg);
};
