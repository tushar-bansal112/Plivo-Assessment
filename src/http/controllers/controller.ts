import { type Request, type Response } from 'express';
import { TopicManager } from '../../pubsub';
import { isValidCreateTopicBody } from '../../schemas';
import { jsonError, jsonSuccess } from '../utils/responseUtils';

export class TopicController {
  constructor(private topics: TopicManager) {}

  createTopic = (req: Request, res: Response) => {
    const body = req.body;
    if (!isValidCreateTopicBody(body)) {
      return jsonError(res, 400, 'BAD_REQUEST', 'Invalid request body', {
        expected: { name: 'Non-empty string' },
      });
    }

    try {
      this.topics.create(body.name);
      return jsonSuccess(res, 201, { status: 'created', topic: body.name });
    } catch (e: any) {
      if (e?.code === 'CONFLICT') {
        return jsonError(res, 409, 'CONFLICT', 'Topic already exists');
      }
      return jsonError(res, 500, 'INTERNAL');
    }
  };

  deleteTopic = (req: Request, res: Response) => {
    const { name } = req.params;
    try {
      this.topics.delete(name, (ws, infoMsg) => ws.send(JSON.stringify(infoMsg)));
      return jsonSuccess(res, 200, { status: 'deleted', topic: name });
    } catch (e: any) {
      if (e?.code === 'TOPIC_NOT_FOUND') {
        return jsonError(res, 404, 'TOPIC_NOT_FOUND', 'Topic not found');
      }
      return jsonError(res, 500, 'INTERNAL');
    }
  };

  listTopics = (_req: Request, res: Response) => {
    return jsonSuccess(res, 200, { topics: this.topics.list() });
  };

  health = (_req: Request, res: Response) => {
    const uptime = this.topics.uptimeSec();
    const stats = this.topics.stats();
    
    return jsonSuccess(res, 200, {
        uptime_sec: uptime,
        topics: this.topics.list().length,
        subscribers: stats.totalSubscribers
        });
     };

  stats = (_req: Request, res: Response) => {
    return jsonSuccess(res, 200, this.topics.stats().topics);
  };

}
