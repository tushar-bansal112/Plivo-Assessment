import { type Response } from 'express';
import { JsonErrorCode } from '../../types';

export const jsonError = (
  res: Response,
  status: number,
  code: JsonErrorCode,
  message?: string,
  details?: unknown,
) =>
  res.status(status).json({
    error: code,
    ...(message ? { message } : {}),
    ...(details ? { details } : {}),
  });

export const jsonSuccess = (
  res: Response,
  status: number,
  data: unknown,
) => res.status(status).json(data);
