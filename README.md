# Plivo PubSub Service

A high-performance, real-time publish-subscribe service built with Node.js, TypeScript, and WebSockets. This service provides a robust messaging infrastructure for building scalable real-time applications.

## 🚀 Features
- **Topic Management**: Create, delete, and manage message topics
- **Message Replay**: Configurable message replay capacity for new subscribers
- **Queue Management**: Configurable overflow policies (disconnect/drop)
- **Authentication**: API key-based authentication for secure access
- **Health Monitoring**: Built-in health checks and statistics
- **Scalable Architecture**: Ring buffer implementation for efficient memory usage
- **TypeScript**: Full type safety and modern development experience

## 🏗️ Architecture

The service consists of:
- **HTTP API**: RESTful endpoints for topic management and monitoring
- **WebSocket Server**: Real-time message delivery to subscribers
- **Topic Manager**: Handles topic creation, deletion, and message distribution
- **Ring Buffer**: Efficient message storage with configurable capacity
- **Subscriber Management**: Handles client connections and message queuing

## 🛠️ Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Plivo-Assessment
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

The service uses the following default configuration (defined in `src/config.ts`):

```typescript
{
  PORT: 3000,
  API_KEY: '918871db-7354-4ddb-835f-b7fab4a60306',
  QUEUE_MAX: 100,
  QUEUE_POLICY: 'disconnect',
  REPLAY_CAPACITY: 100,
  WS_HEARTBEAT_SEC: 30,
}
```

You can modify these values directly in the config file or set environment variables.


### 4. Start the Development Server

```bash
npm start
```

The service will start on `http://localhost:3000`

## 🧪 Testing

### Manual Testing

#### 1. Health Check

```bash
curl -H "X-API-Key: abc" http://localhost:3000/health
```

#### 2. Create a Topic

```bash
curl -X POST \
  -H "X-API-Key: abc" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-topic"}' \
  http://localhost:3000/topics
```

#### 3. List Topics

```bash
curl -H "X-API-Key: abc" http://localhost:3000/topics
```

#### 4. Get Statistics

```bash
curl -H "X-API-Key: abc" http://localhost:3000/stats
```

#### 5. Delete a Topic

```bash
curl -X DELETE \
  -H "X-API-Key: abc" \
  http://localhost:3000/topics/test-topic
```

### WebSocket Testing

#### 1. Connect to WebSocket

**Option A: Using npx wscat (Recommended for CLI testing)**

```bash
# Or use npx directly
npx wscat -c "ws://localhost:3000/ws?apiKey=918871db-7354-4ddb-835f-b7fab4a60306"
```

**Option B: Using browser console or Node.js**

```javascript
// Using browser console or Node.js
const ws = new WebSocket('ws://localhost:3000/ws?apiKey=918871db-7354-4ddb-835f-b7fab4a60306');

ws.onopen = () => {
  console.log('Connected to WebSocket');
  
  // Subscribe to a topic
  ws.send(JSON.stringify({
    type: 'subscribe',
    topic: 'test-topic',
    client_id: 'client-001',
    request_id: 'sub-001'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
};
```

#### 2. Subscribe with Message Replay

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  topic: 'test-topic',
  client_id: 'client-001',
  last_n: 10,
  request_id: 'sub-002'
}));
```

#### 3. Unsubscribe from Topic

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  topic: 'test-topic',
  client_id: 'client-001',
  request_id: 'unsub-001'
}));
```

#### 4. Send Heartbeat

```javascript
ws.send(JSON.stringify({
  type: 'ping',
  request_id: 'ping-001'
}));
```


## 📚 API Reference

### Authentication

All HTTP endpoints require an API key in the `X-API-Key` header.

### HTTP Endpoints

#### Health Check
- **GET** `/health` - Service health status

#### Topic Management
- **POST** `/topics` - Create a new topic
- **GET** `/topics` - List all topics
- **DELETE** `/topics/:name` - Delete a topic
- **GET** `/stats` - Get service statistics

### WebSocket Messages

#### Client to Server
- `subscribe` - Subscribe to a topic (requires `topic`, `client_id`)
- `unsubscribe` - Unsubscribe from a topic (requires `topic`, `client_id`)
- `publish` - Publish a message to a topic (requires `topic`, `message` with `id`)
- `ping` - Send heartbeat ping

#### Server to Client
- `ack` - Acknowledgment message
- `error` - Error message with code and description
- `event` - Published message with topic and content
- `pong` - Heartbeat response
- `info` - Informational message

## 🐳 Docker Deployment

### Build the Image

```bash
docker build -t plivo-pubsub .
```

### Run the Container

```bash
docker run --rm -p 3000:3000 -e API_KEY=918871db-7354-4ddb-835f-b7fab4a60306 plivo-pubsub

```

The service will be available on `http://localhost:3000`

### Environment Variables

You can override these defaults by setting environment variables:

```bash
export PORT=3000
export API_KEY='918871db-7354-4ddb-835f-b7fab4a60306'
export QUEUE_MAX=100
export QUEUE_POLICY=drop
export REPLAY_CAPACITY=100
export WS_HEARTBEAT_SEC=30
```

## 📁 Project Structure

```
src/
├── config.ts          # Configuration management
├── index.ts           # Application entry point
├── pubsub.ts          # Core pub/sub logic
├── types.ts           # TypeScript type definitions
├── utils.ts           # Utility functions
├── http/              # HTTP server components
│   ├── app.ts         # Express app setup
│   ├── controllers/   # Request handlers
│   ├── middleware/    # Authentication & error handling
│   ├── routes/        # API route definitions
│   └── utils/         # HTTP utilities
└── websocket/         # WebSocket server
    └── server.ts      # WebSocket implementation
```
