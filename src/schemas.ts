export interface SubscribeMessage {
  type: 'subscribe';
  topic: string;
  client_id: string;
  last_n?: number;
  request_id?: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  topic: string;
  client_id: string;
  request_id?: string;
}

export interface PublishMessage {
  type: 'publish';
  topic: string;
  message: {
    id: string;
    [key: string]: any;
  };
  request_id?: string;
}

export interface PingMessage {
  type: 'ping';
  request_id?: string;
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage | PublishMessage | PingMessage;

export interface CreateTopicBody {
  name: string;
}

// Validation functions
export function isValidSubscribeMessage(data: any): data is SubscribeMessage {
  return (
    data &&
    typeof data === 'object' &&
    data.type === 'subscribe' &&
    typeof data.topic === 'string' &&
    data.topic.length > 0 &&
    typeof data.client_id === 'string' &&
    data.client_id.length > 0 &&
    (data.last_n === undefined || (typeof data.last_n === 'number' && Number.isInteger(data.last_n) && data.last_n >= 0)) &&
    (data.request_id === undefined || typeof data.request_id === 'string')
  );
}

export function isValidUnsubscribeMessage(data: any): data is UnsubscribeMessage {
  return (
    data &&
    typeof data === 'object' &&
    data.type === 'unsubscribe' &&
    typeof data.topic === 'string' &&
    data.topic.length > 0 &&
    typeof data.client_id === 'string' &&
    data.client_id.length > 0 &&
    (data.request_id === undefined || typeof data.request_id === 'string')
  );
}

export function isValidPublishMessage(data: any): data is PublishMessage {
  return (
    data &&
    typeof data === 'object' &&
    data.type === 'publish' &&
    typeof data.topic === 'string' &&
    data.topic.length > 0 &&
    data.message &&
    typeof data.message === 'object' &&
    typeof data.message.id === 'string' &&
    (data.request_id === undefined || typeof data.request_id === 'string')
  );
}

export function isValidPingMessage(data: any): data is PingMessage {
  return (
    data &&
    typeof data === 'object' &&
    data.type === 'ping' &&
    (data.request_id === undefined || typeof data.request_id === 'string')
  );
}

export function isValidClientMessage(data: any): data is ClientMessage {
  return (
    isValidSubscribeMessage(data) ||
    isValidUnsubscribeMessage(data) ||
    isValidPublishMessage(data) ||
    isValidPingMessage(data)
  );
}

export function isValidCreateTopicBody(data: any): data is CreateTopicBody {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    data.name.length > 0
  );
}
