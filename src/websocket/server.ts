import http from 'http';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { isValidClientMessage, type ClientMessage } from '../schemas';
import { nowISO } from '../utils';
import { TopicManager } from '../pubsub';
import { Ack, ServerToClient, WsOpts, Err, Event, Pong } from '../types';

const makeAck = (request_id?: string, topic?: string): Ack => ({
  type: 'ack',
  request_id,
  topic,
  status: 'ok' as const,
  ts: nowISO(),
});

const makeError = (code: string, message: string, request_id?: string): Err => ({
  type: 'error' as const,
  request_id,
  error: { code, message },
  ts: nowISO(),
});

const makeEvent = (topic: string, message: unknown): Event => ({
  type: 'event' as const,
  topic,
  message,
  ts: nowISO(),
});

const makePong = (request_id?: string): Pong => ({
  type: 'pong' as const,
  request_id,
  ts: nowISO(),
});

const send = (ws: WebSocket, payload: ServerToClient) => {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
};

const closeSafe = (ws: WebSocket, code: number, reason: string) => {
  try {
    ws.close(code, reason);
  } catch {
  }
};

const authorized = (req: http.IncomingMessage, apiKey?: string): boolean => {
  if (!apiKey) return true;
  const url = new URL(req.url || '/', 'http://localhost');
  const q = url.searchParams.get('apiKey');
  const subproto = req.headers['sec-websocket-protocol'];
  return q === apiKey || subproto === apiKey;
};

export const attachWs = (
  server: http.Server,
  topics: TopicManager,
  opts: WsOpts = {},
) => {
  const { path = '/ws', apiKey, heartbeatSec = 30 } = opts;
  const connection = new WebSocketServer({ server, path });

  connection.on('connection', (ws, req) => {
    if (!authorized(req, apiKey)) {
      send(ws, makeError('UNAUTHORIZED', 'Invalid API key'));
      return closeSafe(ws, 1008, 'UNAUTHORIZED');
    }

    const subscriptions = new Map<string, () => void>();

    ws.on('message', (raw) => {
      const parsed: unknown = (() => {
        try {
          return JSON.parse(raw.toString());
        } catch {
          return null;
        }
      })();

      if (!parsed) {
        return send(ws, makeError('BAD_REQUEST', 'invalid JSON'));
      }

      if (!isValidClientMessage(parsed)) {
        return send(ws, makeError('BAD_REQUEST', 'schema validation failed'));
      }

      const msg = parsed as ClientMessage;

      switch (msg.type) {
        case 'ping': {
          return send(ws, makePong(msg.request_id));
        }

        case 'subscribe': {
          try {
            const unsub = topics.subscribe({
              name: msg.topic,
              clientId: msg.client_id,
              ws,
              lastN: msg.last_n,
              makeEvent,
            });
            subscriptions.set(msg.topic, unsub);
            return send(ws, makeAck(msg.request_id, msg.topic));
          } catch (e: any) {
            if (e?.code === 'TOPIC_NOT_FOUND') {
              return send(ws, makeError('TOPIC_NOT_FOUND', 'Topic not found', msg.request_id));
            }
            return send(ws, makeError('INTERNAL', 'Unexpected error', msg.request_id));
          }
        }

        case 'unsubscribe': {
          const unsub = subscriptions.get(msg.topic);
          if (unsub) {
            unsub();
            subscriptions.delete(msg.topic);
          }
          return send(ws, makeAck(msg.request_id, msg.topic));
        }

        case 'publish': {
          try {
            topics.publish({
              name: msg.topic,
              message: msg.message,
              makeEvent,
              handleOverflow: (subscriber) => { subscriber.ws.send(JSON.stringify(makeError('SLOW_CONSUMER', 'subscriber queue overflow', msg.request_id))); try { subscriber.ws.close(1009, 'SLOW_CONSUMER'); } catch {} },
            });
            return send(ws, makeAck(msg.request_id, msg.topic));
          } catch (e: any) {
            if (e?.code === 'TOPIC_NOT_FOUND') {
              return send(ws, makeError('TOPIC_NOT_FOUND', 'Topic not found', msg.request_id));
            }
            return send(ws, makeError('INTERNAL', 'Unexpected error', msg.request_id));
          }
        }

        default: {
          return send(ws, makeError('BAD_REQUEST', 'unsupported type'));
        }
      }
    });

    ws.on('close', () => {
      for (const [, unsub] of subscriptions) {
        try {
          unsub();
        } catch {
        }
      }
      subscriptions.clear();
    });
  });

  
  const interval = setInterval(() => {
    for (const client of connection.clients) {
      if (client.readyState === 1) {
        send(client as WebSocket, { type: 'info', msg: 'ping', ts: nowISO() });
      }
    }
  }, Math.max(1, heartbeatSec) * 1000);

  connection.on('close', () => clearInterval(interval));

  return connection;
};
