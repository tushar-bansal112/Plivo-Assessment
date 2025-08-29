import http from 'http';
import { loadConfig } from './config';
import { TopicManager } from './pubsub';
import { buildHttpApp } from './http/app';
import { attachWs } from './websocket/server';

async function main() {
  const config = loadConfig();
  const topics = new TopicManager();
  const app = buildHttpApp(topics);

  const server = http.createServer(app);
  server.listen(config.PORT, () => {
    console.log(`HTTP server listening on port ${config.PORT}`);
  });

  attachWs(server, topics, { path: '/ws', apiKey: config.API_KEY, heartbeatSec: config.WS_HEARTBEAT_SEC });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal boot error', err);
  process.exit(1);
});
