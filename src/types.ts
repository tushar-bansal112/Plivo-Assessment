export interface Ack {
  type: 'ack';
  request_id?: string;
  topic?: string;
  status: 'ok';
  ts: string;
};

export interface Err {
  type: 'error';
  request_id?: string;
  error: { code: string; message: string };
  ts: string;
};

export interface WsOpts {
  path?: string;
  apiKey?: string;
  heartbeatSec?: number;
};

export interface Pong { 
  type: 'pong'; 
  request_id?: string; 
  ts: string 
};

export interface Info { 
  type: 'info'; 
  msg: string; 
  ts: string 
};

export interface Event { 
  type: 'event';
  topic: string;
  message: unknown;
  ts: string;
};

export type ServerToClient = Ack | Err | Pong | Event | Info;

export interface AppConfig {
  PORT: number;
  API_KEY: string;
  QUEUE_MAX: number;
  QUEUE_POLICY: 'disconnect' | 'drop';
  REPLAY_CAPACITY: number;
  WS_HEARTBEAT_SEC: number;
}


export type JsonErrorCode =
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'TOPIC_NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL'
  | 'SLOW_CONSUMER';


export interface WebSocketLike {
  readonly OPEN: number;
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  bufferedAmount?: number;
}


export type OverflowPolicy = 'disconnect' | 'drop';

export interface EventEnvelope<T = unknown> {
  type: 'event';
  topic: string;
  message: T;
  ts: string;
}

