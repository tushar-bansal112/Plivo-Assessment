import express from 'express';
import cors from 'cors';
import { TopicManager } from '../pubsub';
import { createRoutes } from './routes/routes';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler';

export const buildHttpApp = (topics: TopicManager) => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/', createRoutes(topics));

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};
