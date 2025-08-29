import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { loadConfig } from '../../config';
import { jsonError } from '../utils/responseUtils';

export const requireApiKey: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const config = loadConfig();
  if (!config.API_KEY) return next();
  
  const key = req.get('x-api-key');
  if (key === config.API_KEY) return next();
  
  return jsonError(res, 401, 'UNAUTHORIZED', 'Missing or invalid X-API-Key');
};
