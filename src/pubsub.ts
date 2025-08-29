import { nowISO } from './utils';
import { OverflowPolicy, WebSocketLike, EventEnvelope } from './types';

const QUEUE_MAX = 100;
const REPLAY_CAPACITY = 100;
const QUEUE_POLICY = 'disconnect';


export class RingBuffer<T> {
  private readonly capacity: number;
  private readonly buf: (T | undefined)[];
  private start = 0;
  private _size = 0;

  constructor(capacity = 100) {
    if (!Number.isFinite(capacity) || capacity < 1) {
      throw new Error(`RingBuffer requires capacity >= 1, got ${capacity}`);
    }
    this.capacity = Math.floor(capacity);
    this.buf = new Array<T | undefined>(this.capacity);
  }

  get size(): number { return this._size; }
  get max(): number { return this.capacity; }

  push(item: T): void {
    const idx = (this.start + this._size) % this.capacity;
    this.buf[idx] = item;
    if (this._size < this.capacity) {
      this._size++;
    } else {
      this.start = (this.start + 1) % this.capacity;
    }
  }

  lastN(n: number): T[] {
    const take = Math.max(0, Math.min(Math.floor(n), this._size));
    const out: T[] = new Array(take);
    for (let i = 0; i < take; i++) {
      const idx = (this.start + (this._size - take + i)) % this.capacity;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out[i] = this.buf[idx]!;
    }
    return out;
  }

  clear(): void {
    this.start = 0;
    this._size = 0;
    this.buf.fill(undefined);
  }
}

export class Subscriber {
  readonly clientId: string;
  readonly ws: WebSocketLike;
  readonly maxQueue: number;
  readonly policy: OverflowPolicy;

  private queue: EventEnvelope[] = [];
  private draining = false;
  private drainScheduled = false;

  private readonly batchSize = 64;
  private readonly highWaterBytes = 1e6;

  constructor(opts: {
    clientId: string;
    ws: WebSocketLike;
    maxQueue?: number;
    policy?: OverflowPolicy;
  }) {
    this.clientId = opts.clientId;
    this.ws = opts.ws;
    this.maxQueue = Math.max(1, Math.floor(opts.maxQueue ?? QUEUE_MAX));
    this.policy = opts.policy ?? QUEUE_POLICY;
  }

  enqueue(msg: EventEnvelope, onOverflow?: (s: Subscriber) => void): void {
    if (this.queue.length >= this.maxQueue) {
      if (this.policy === 'drop') {
        this.queue.shift();
        this.queue.push(msg);
      } else {
        onOverflow?.(this);
        return;
      }
    } else {
      this.queue.push(msg);
    }
    this.scheduleDrain();
  }

  drain(): void {
    this.scheduleDrain();
  }

  private scheduleDrain(): void {
    if (this.drainScheduled) return;
    this.drainScheduled = true;
    queueMicrotask(() => {
      this.drainScheduled = false;
      this.drainLoop();
    });
  }

  private drainLoop(): void {
    if (this.draining) return;
    if (this.ws.readyState !== this.ws.OPEN) return;

    this.draining = true;
    try {
      while (this.queue.length > 0 && this.ws.readyState === this.ws.OPEN) {
        let sent = 0;
        while (sent < this.batchSize && this.queue.length > 0 && this.ws.readyState === this.ws.OPEN) {
          const next = this.queue.shift();
          if (!next) break;
          try {
            this.ws.send(JSON.stringify(next));
          } catch {
          }
          sent++;
        }

        if (typeof this.ws.bufferedAmount === 'number' && this.ws.bufferedAmount > this.highWaterBytes) {
          setTimeout(() => this.drainLoop(), 0);
          return;
        }
      }
    } finally {
      this.draining = false;
    }
  }
}

class Topic<T = unknown> {
  readonly name: string;
  readonly subscribers: Map<string, Subscriber> = new Map();
  messages = 0;
  readonly ring: RingBuffer<{ ts: string; message: T }>;

  constructor(name: string, replayCapacity = REPLAY_CAPACITY) {
    if (!name) throw new Error('Topic name is required');
    this.name = name;
    this.ring = new RingBuffer(replayCapacity);
  }

  stats() {
    return { messages: this.messages, subscribers: this.subscribers.size };
  }

  addSubscriber(sub: Subscriber) {
    this.subscribers.set(sub.clientId, sub);
  }

  removeSubscriber(clientId: string) {
    this.subscribers.delete(clientId);
  }

  hasSubscriber(clientId: string) {
    return this.subscribers.has(clientId);
  }

  fanout(eventObj: EventEnvelope<T>, handleOverflow?: (s: Subscriber) => void) {
    for (const sub of this.subscribers.values()) {
      sub.enqueue(eventObj, handleOverflow);
    }
  }
}

export class TopicManager {
  private readonly topics: Map<string, Topic> = new Map();
  private readonly createdAt = Date.now();
  private _totalSubscribers = 0;

  uptimeSec(): number {
    return Math.floor((Date.now() - this.createdAt) / 1000);
  }

  list() {
    return [...this.topics.values()].map((t) => ({ name: t.name, subscribers: t.subscribers.size }));
  }

  

  stats() {
    const data: Record<string, { messages: number; subscribers: number }> = {};
    for (const [name, t] of this.topics.entries()) data[name] = t.stats();
    return { topics: data, totalSubscribers: this._totalSubscribers };
  }

  getOrThrow(name: string): Topic {
    const t = this.topics.get(name);
    if (!t) {
      const err = new Error('TOPIC_NOT_FOUND') as Error & { code?: string };
      err.code = 'TOPIC_NOT_FOUND';
      throw err;
    }
    return t;
  }

  create(name: string): Topic {
    if (this.topics.has(name)) {
      const err = new Error('Topic already exists') as Error & { code?: string };
      err.code = 'CONFLICT';
      throw err;
    }
    const t = new Topic(name, REPLAY_CAPACITY);
    this.topics.set(name, t);
    return t;
  }

  delete(name: string, notifyFn?: (ws: WebSocketLike, infoMsg: unknown) => void) {
    const t = this.topics.get(name);
    if (!t) {
      const err = new Error('TOPIC_NOT_FOUND') as Error & { code?: string };
      err.code = 'TOPIC_NOT_FOUND';
      throw err;
    }
    for (const sub of t.subscribers.values()) {
      notifyFn?.(sub.ws, { type: 'info', topic: name, msg: 'topic_deleted', ts: nowISO() });
      try { sub.ws.close(1000, 'topic_deleted'); } catch { /* noop */ }
      this._totalSubscribers = Math.max(0, this._totalSubscribers - 1);
    }
    this.topics.delete(name);
  }

  subscribe<T = unknown>(opts: {
    name: string;
    clientId: string;
    ws: WebSocketLike;
    lastN?: number;
    makeEvent: (topic: string, message: unknown) => EventEnvelope<T>;
  }): () => void {
    const { name, clientId, ws, lastN, makeEvent } = opts;
    const t = this.getOrThrow(name);


    if (t.hasSubscriber(clientId)) {
      const prev = t.subscribers.get(clientId);
      try { prev?.ws.close(1000, 'replaced'); } catch { /* noop */ }
      t.removeSubscriber(clientId);
      this._totalSubscribers = Math.max(0, this._totalSubscribers - 1);
    }

    const sub = new Subscriber({ clientId, ws, maxQueue: QUEUE_MAX, policy: QUEUE_POLICY });
    t.addSubscriber(sub);
    this._totalSubscribers++;

    
    if (lastN && Number(lastN) > 0) {
      const replay = t.ring.lastN(Number(lastN));
      for (const m of replay) sub.enqueue(makeEvent(name, m.message));
      sub.drain();
    }

  
    return () => {
      if (t.subscribers.delete(clientId)) {
        this._totalSubscribers = Math.max(0, this._totalSubscribers - 1);
      }
    };
  }

  publish<T = unknown>(opts: {
    name: string;
    message: T;
    makeEvent: (topic: string, message: T) => EventEnvelope<T>;
    handleOverflow?: (s: Subscriber) => void;
  }) {
    const { name, message, makeEvent, handleOverflow } = opts;
    const t = this.getOrThrow(name);
    t.messages++;
    t.ring.push({ ts: nowISO(), message });
    t.fanout(makeEvent(name, message), handleOverflow);
  }
}

export { RingBuffer as ReplayBuffer };
