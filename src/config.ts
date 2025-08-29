import { AppConfig } from './types';
export function loadConfig(): AppConfig {
  return {
    PORT: 3000,
    API_KEY: '918871db-7354-4ddb-835f-b7fab4a60306',
    QUEUE_MAX: 100,
    QUEUE_POLICY: 'disconnect',
    REPLAY_CAPACITY:  100,
    WS_HEARTBEAT_SEC: 30,
  };
}
