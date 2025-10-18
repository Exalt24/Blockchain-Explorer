# API Documentation

Base URL: `http://localhost:4000/api`

## Authentication

Currently, the API does not require authentication. For production, implement API keys or OAuth2.

## Rate Limiting

No rate limiting is currently enforced. Recommended for production: 100 requests per minute per IP.

## Response Format

All responses follow this structure:

### Success Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1523,
    "totalPages": 31
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

## Endpoints

### Events

#### GET /api/events

Retrieve paginated blockchain events with optional filtering.

**Query Parameters:**
- `page` (number, optional): Page number, default 1
- `limit` (number, optional): Items per page, default 50, max 100
- `eventType` (string, optional): Filter by event name (PlayerJoined, ScoreUpdated, ItemPurchased, GameReset)
- `playerAddress` (string, optional): Filter by player Ethereum address
- `fromDate` (ISO 8601, optional): Filter events after this date
- `toDate` (ISO 8601, optional): Filter events before this date

**Example Request:**
```bash
GET /api/events?page=1&limit=20&eventType=PlayerJoined&playerAddress=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Example Response:**
```json
{
  "data": [
    {
      "id": 123,
      "block_number": "12345",
      "block_hash": "0xabc...",
      "transaction_hash": "0xdef...",
      "log_index": 0,
      "contract_address": "0x5fbdb...",
      "event_name": "PlayerJoined",
      "event_data": {
        "arg0": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "arg1": "1697894827"
      },
      "decoded_data": {
        "player": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "timestamp": "1697894827"
      },
      "timestamp": "2024-10-21T10:30:27.000Z",
      "created_at": "2024-10-21T10:30:28.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid parameters
- `500`: Server error

---

#### GET /api/events/tx/:hash

Retrieve all events from a specific transaction.

**Path Parameters:**
- `hash` (string, required): Transaction hash (0x...)

**Example Request:**
```bash
GET /api/events/tx/0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab
```

**Example Response:**
```json
[
  {
    "id": 123,
    "block_number": "12345",
    "transaction_hash": "0xdef...",
    "event_name": "PlayerJoined",
    "decoded_data": {
      "player": "0xf39Fd6...",
      "timestamp": "1697894827"
    },
    "timestamp": "2024-10-21T10:30:27.000Z"
  }
]
```

**Status Codes:**
- `200`: Success (empty array if no events)
- `400`: Invalid hash format
- `500`: Server error

---

#### GET /api/events/block/:block

Retrieve all events from a specific block.

**Path Parameters:**
- `block` (number, required): Block number

**Example Request:**
```bash
GET /api/events/block/12345
```

**Example Response:**
```json
[
  {
    "id": 123,
    "block_number": "12345",
    "event_name": "PlayerJoined",
    "decoded_data": {
      "player": "0xf39Fd6...",
      "timestamp": "1697894827"
    }
  }
]
```

**Status Codes:**
- `200`: Success (empty array if no events)
- `400`: Invalid block number
- `500`: Server error

---

### Statistics

#### GET /api/stats

Get platform-wide statistics.

**Cache:** 5 seconds

**Example Request:**
```bash
GET /api/stats
```

**Example Response:**
```json
{
  "totalEvents": 1523,
  "uniquePlayers": 48,
  "eventsLast24h": 234,
  "latestBlock": "12345"
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

#### GET /api/leaderboard

Get top players by event count.

**Query Parameters:**
- `limit` (number, optional): Number of players, default 10, max 100

**Cache:** 30 seconds

**Example Request:**
```bash
GET /api/leaderboard?limit=5
```

**Example Response:**
```json
[
  {
    "player": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "eventCount": 45,
    "lastActivity": "2024-10-21T15:30:00.000Z"
  },
  {
    "player": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "eventCount": 38,
    "lastActivity": "2024-10-21T14:25:00.000Z"
  }
]
```

**Status Codes:**
- `200`: Success
- `400`: Invalid limit
- `500`: Server error

---

#### GET /api/stats/distribution

Get event type distribution with percentages.

**Cache:** 60 seconds

**Example Request:**
```bash
GET /api/stats/distribution
```

**Example Response:**
```json
[
  {
    "eventName": "ScoreUpdated",
    "count": 856,
    "percentage": 56.19
  },
  {
    "eventName": "PlayerJoined",
    "count": 425,
    "percentage": 27.90
  },
  {
    "eventName": "ItemPurchased",
    "count": 189,
    "percentage": 12.41
  },
  {
    "eventName": "GameReset",
    "count": 53,
    "percentage": 3.48
  }
]
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

#### GET /api/stats/timeline

Get hourly event counts over time.

**Query Parameters:**
- `hours` (number, optional): Time window in hours, default 24, max 168 (7 days)

**Cache:** 60 seconds

**Example Request:**
```bash
GET /api/stats/timeline?hours=48
```

**Example Response:**
```json
[
  {
    "hour": "2024-10-21 10:00",
    "count": 23
  },
  {
    "hour": "2024-10-21 11:00",
    "count": 45
  }
]
```

**Status Codes:**
- `200`: Success
- `400`: Invalid hours parameter
- `500`: Server error

---

### Health

#### GET /health

Check system health status.

**No Cache**

**Example Request:**
```bash
GET /health
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-10-21T15:30:27.123Z",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "up",
      "latency": 5,
      "message": "Database connection healthy"
    },
    "blockchain": {
      "status": "up",
      "latency": 15,
      "message": "Blockchain connection healthy",
      "details": {
        "latestBlock": 12345
      }
    },
    "eventListener": {
      "status": "up",
      "message": "EventListener running normally",
      "details": {
        "isListening": true,
        "lastProcessedBlock": 12345,
        "consecutiveErrors": 0
      }
    },
    "websocket": {
      "status": "up",
      "message": "WebSocket server running",
      "details": {
        "connectedClients": 5
      }
    }
  },
  "cache": {
    "totalEntries": 12,
    "validEntries": 12,
    "expiredEntries": 0,
    "memoryUsage": "15.23 KB"
  }
}
```

**Status Codes:**
- `200`: Healthy
- `503`: Degraded (some services down)
- `500`: Unhealthy (critical services down)

---

## WebSocket Events

Connect to: `ws://localhost:4000`

### Client → Server

#### ping
Request a pong response for latency testing.

**Emit:**
```javascript
socket.emit('ping');
```

**Receive:**
```javascript
socket.on('pong', (data) => {
  console.log('Latency:', Date.now() - data.timestamp);
});
```

---

### Server → Client

#### newEvent
Broadcast when a new blockchain event is indexed.

**Event Data:**
```javascript
{
  "id": 123,
  "block_number": "12345",
  "event_name": "PlayerJoined",
  "decoded_data": {
    "player": "0xf39Fd6...",
    "timestamp": "1697894827"
  },
  "timestamp": "2024-10-21T10:30:27.000Z"
}
```

**Client Handler:**
```javascript
socket.on('newEvent', (event) => {
  console.log('New event:', event);
});
```

---

#### statsUpdate
Broadcast every 10 seconds with platform statistics.

**Event Data:**
```javascript
{
  "totalEvents": 1523,
  "uniquePlayers": 48,
  "eventsLast24h": 234,
  "latestBlock": "12345"
}
```

**Client Handler:**
```javascript
socket.on('statsUpdate', (stats) => {
  console.log('Stats:', stats);
});
```

---

#### blockUpdate
Broadcast when a new block is processed (throttled to 1/second).

**Event Data:**
```javascript
{
  "blockNumber": "12345",
  "blockHash": "0xabc..."
}
```

**Client Handler:**
```javascript
socket.on('blockUpdate', (block) => {
  console.log('New block:', block);
});
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PARAMETER` | Query parameter validation failed |
| `NOT_FOUND` | Resource not found |
| `DATABASE_ERROR` | Database operation failed |
| `BLOCKCHAIN_ERROR` | Blockchain connection or query failed |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch events
const response = await fetch('http://localhost:4000/api/events?page=1&limit=20');
const { data, pagination } = await response.json();

// WebSocket connection
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Connected');
});

socket.on('newEvent', (event) => {
  console.log('New event:', event);
});

socket.on('statsUpdate', (stats) => {
  console.log('Stats:', stats);
});
```

### Python

```python
import requests
import socketio

# REST API
response = requests.get('http://localhost:4000/api/stats')
stats = response.json()
print(stats)

# WebSocket
sio = socketio.Client()

@sio.on('connect')
def on_connect():
    print('Connected')

@sio.on('newEvent')
def on_new_event(data):
    print('New event:', data)

sio.connect('http://localhost:4000')
sio.wait()
```

### cURL

```bash
# Get stats
curl http://localhost:4000/api/stats

# Get events with filters
curl "http://localhost:4000/api/events?eventType=PlayerJoined&limit=10"

# Health check
curl http://localhost:4000/health
```

---

## Best Practices

1. **Pagination**: Always use pagination for `/api/events` to avoid large responses
2. **Caching**: Responses are cached; frequent polling not necessary
3. **WebSocket**: Use WebSocket for real-time updates instead of polling REST API
4. **Error Handling**: Always check response status codes
5. **Rate Limiting**: Implement client-side throttling to avoid overwhelming server
6. **Timeouts**: Set reasonable timeouts (5-10 seconds recommended)
7. **Retry Logic**: Implement exponential backoff for failed requests
8. **Data Validation**: Validate all query parameters before sending

---

## Performance Tips

- Use `limit` parameter to control response size
- Cache responses on client side
- Use WebSocket for real-time updates
- Batch multiple API calls when possible
- Monitor cache hit rates in `/health` endpoint
- Use appropriate filters to reduce data transfer