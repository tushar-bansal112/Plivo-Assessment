import { Router } from 'express';
import { TopicController } from '../controllers/controller';
import { requireApiKey } from '../middleware/auth';
import { TopicManager } from '../../pubsub';

export const createRoutes = (topics: TopicManager) => {
  const router = Router();
  const topicController = new TopicController(topics);


  router.use(requireApiKey);

  router.post('/topics', topicController.createTopic);
  router.delete('/topics/:name', topicController.deleteTopic);
  router.get('/topics', topicController.listTopics);
  router.get('/health', topicController.health);
  router.get('/stats', topicController.stats);

  return router;
};
