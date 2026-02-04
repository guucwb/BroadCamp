# API Documentation

Complete reference for InituCastt REST API.

**Base URL**: `http://localhost:3001/api`

**Authentication**: JWT Bearer token (optional, but recommended)

**Rate Limiting**:
- General API: 100 requests / 15 minutes
- Auth endpoints: 5 requests / 15 minutes
- Webhooks: 100 requests / 1 minute

---

## Table of Contents

- [Authentication](#authentication)
- [Journeys](#journeys)
- [Runs](#runs)
- [Campaigns](#campaigns)
- [Messages](#messages)
- [Templates](#templates)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)

---

## Authentication

### Generate Token

```http
POST /auth/login
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response** `200 OK`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Using Token

Include in `Authorization` header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Journeys

### List All Journeys

```http
GET /journeys
GET /journeys?status=active
```

**Query Parameters**:
- `status` (optional): Filter by status (`draft`, `active`, `archived`)

**Response** `200 OK`:
```json
[
  {
    "id": "journey_123",
    "name": "Welcome Flow",
    "status": "active",
    "nodes": [...],
    "edges": [...],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-20T15:30:00.000Z",
    "userId": "user_123"
  }
]
```

---

### Get Journey by ID

```http
GET /journeys/:id
```

**Response** `200 OK`:
```json
{
  "id": "journey_123",
  "name": "Welcome Flow",
  "status": "active",
  "nodes": [
    {
      "id": "node_1",
      "type": "audience",
      "position": { "x": 100, "y": 100 },
      "data": {
        "phoneKey": "phone",
        "mapping": { "nome": "name", "email": "email" },
        "allRows": [
          { "phone": "+5541991234567", "nome": "João", "email": "joao@example.com" }
        ]
      }
    },
    {
      "id": "node_2",
      "type": "message",
      "position": { "x": 300, "y": 100 },
      "data": {
        "text": "Olá {{name}}, seja bem-vindo!",
        "channel": "whatsapp"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ],
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-20T15:30:00.000Z"
}
```

**Error** `404 Not Found`:
```json
{
  "error": "Journey not found"
}
```

---

### Create Journey

```http
POST /journeys
```

**Request Body**:
```json
{
  "id": "journey_456",
  "name": "New Welcome Flow",
  "nodes": [
    {
      "id": "node_1",
      "type": "audience",
      "position": { "x": 100, "y": 100 },
      "data": {}
    }
  ],
  "edges": []
}
```

**Response** `200 OK`:
```json
{
  "id": "journey_456",
  "name": "New Welcome Flow",
  "status": "draft",
  "nodes": [...],
  "edges": [],
  "createdAt": "2026-02-03T10:00:00.000Z",
  "updatedAt": "2026-02-03T10:00:00.000Z",
  "userId": "user_123"
}
```

**Validation Errors** `400 Bad Request`:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "\"name\" is required"
    }
  ]
}
```

---

### Update Journey

```http
PUT /journeys/:id
```

**Request Body** (partial update):
```json
{
  "name": "Updated Name",
  "status": "active"
}
```

**Response** `200 OK`:
```json
{
  "id": "journey_123",
  "name": "Updated Name",
  "status": "active",
  ...
}
```

---

### Delete Journey

```http
DELETE /journeys/:id
```

**Response** `200 OK`:
```json
{
  "ok": true
}
```

---

### Duplicate Journey

```http
POST /journeys/:id/duplicate
```

**Response** `200 OK`:
```json
{
  "id": "journey_789",
  "name": "Welcome Flow (Copy)",
  "status": "draft",
  "nodes": [...],  // Same nodes with new IDs
  "edges": [...]   // Same edges with new IDs
}
```

---

### Launch Journey

Start a new run for a journey.

```http
POST /journeys/:id/launch
```

**Request Body** (Option 1: Explicit audience):
```json
{
  "audience": [
    {
      "phone": "+5541991234567",
      "name": "João Silva",
      "email": "joao@example.com"
    },
    {
      "phone": "+5541998765432",
      "name": "Maria Santos",
      "email": "maria@example.com"
    }
  ]
}
```

**Request Body** (Option 2: Use audience from journey):
```json
{}
```
(Extracts audience from the journey's audience node)

**Response** `200 OK`:
```json
{
  "ok": true,
  "runId": "run_1738612345678"
}
```

**Errors**:
- `404`: Journey not found
- `400`: No audience provided or found
- `400`: Audience node must have phoneKey and rows

**Flow**:
1. Creates Run in database
2. Creates Contacts for run
3. Queues run to `flowQueue` (BullMQ)
4. Returns immediately (processing happens in background)

---

## Runs

### List All Runs

```http
GET /runs
GET /runs?status=running
```

**Query Parameters**:
- `status` (optional): Filter by status (`queued`, `running`, `done`, `failed`, `stopped`)

**Response** `200 OK`:
```json
[
  {
    "id": "run_123",
    "flowId": "journey_123",
    "flowName": "Welcome Flow",
    "status": "running",
    "total": 100,
    "processed": 45,
    "startedAt": "2026-02-03T10:00:00.000Z",
    "endedAt": null,
    "error": null,
    "createdAt": "2026-02-03T10:00:00.000Z",
    "updatedAt": "2026-02-03T10:15:00.000Z",
    "journeyId": "journey_123",
    "userId": "user_123"
  }
]
```

---

### Get Run by ID

```http
GET /runs/:id
GET /runs/:id?includeContacts=true
```

**Query Parameters**:
- `includeContacts` (optional): Include contacts array (default: false)

**Response** `200 OK` (without contacts):
```json
{
  "id": "run_123",
  "flowId": "journey_123",
  "flowName": "Welcome Flow",
  "status": "running",
  "total": 100,
  "processed": 45,
  ...
}
```

**Response** `200 OK` (with contacts):
```json
{
  "id": "run_123",
  ...
  "contacts": [
    {
      "id": "contact_1",
      "runId": "run_123",
      "phone": "+5541991234567",
      "vars": { "name": "João", "email": "joao@example.com" },
      "cursor": "node_2",
      "state": "active",
      "history": [
        {
          "ts": "2026-02-03T10:00:00.000Z",
          "type": "visit",
          "nodeId": "node_1",
          "nodeType": "audience"
        },
        {
          "ts": "2026-02-03T10:00:05.000Z",
          "type": "outbound",
          "channel": "whatsapp",
          "body": "Olá João, seja bem-vindo!"
        }
      ],
      "lastInbound": null,
      "wait": null
    }
  ]
}
```

---

### Get Run Statistics

```http
GET /runs/:id/stats
```

**Response** `200 OK`:
```json
{
  "runId": "run_123",
  "status": "running",
  "total": 100,
  "processed": 75,
  "percentage": 75,
  "byState": {
    "active": 10,
    "waiting": 5,
    "waiting-inbound": 2,
    "done": 75,
    "failed": 8
  },
  "startedAt": "2026-02-03T10:00:00.000Z",
  "duration": 900000,  // milliseconds
  "estimatedCompletion": "2026-02-03T10:20:00.000Z"
}
```

---

### Export Run as CSV

```http
GET /runs/:id/export
```

**Response** `200 OK` (CSV file):
```
phone,name,email,state,cursor
+5541991234567,João,joao@example.com,done,node_3
+5541998765432,Maria,maria@example.com,waiting,node_2
...
```

**Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="run_123_export.csv"
```

---

### Stop Run

```http
POST /runs/:id/stop
```

**Response** `200 OK`:
```json
{
  "ok": true
}
```

**Errors**:
- `404`: Run not found
- `400`: Cannot stop run with status 'done' (only queued/running can be stopped)

**Behavior**:
- Updates run status to 'stopped'
- Removes job from flow queue
- Contacts in 'active' state remain active (can be resumed manually)

---

### Delete Run

```http
DELETE /runs/:id
```

**Response** `200 OK`:
```json
{
  "ok": true
}
```

---

## Campaigns

### Upload CSV

```http
POST /campaign/upload
Content-Type: multipart/form-data
```

**Form Data**:
- `file`: CSV file

**Response** `200 OK`:
```json
{
  "data": [
    { "phone": "+5541991234567", "name": "João", "email": "joao@example.com" },
    { "phone": "+5541998765432", "name": "Maria", "email": "maria@example.com" }
  ]
}
```

**CSV Format**:
```csv
phone,name,email
+5541991234567,João Silva,joao@example.com
+5541998765432,Maria Santos,maria@example.com
```

---

### Send Campaign

Queue messages for bulk sending.

```http
POST /campaign/send
```

**Request Body**:
```json
{
  "name": "Black Friday Campaign",
  "messages": [
    {
      "to": "+5541991234567",
      "body": "Olá {{name}}, aproveite nosso desconto!",
      "channel": "whatsapp",
      "variables": { "name": "João" }
    },
    {
      "to": "+5541998765432",
      "contentSid": "CT1234567890abcdef",
      "variables": { "name": "Maria", "discount": "20%" },
      "channel": "whatsapp"
    }
  ]
}
```

**Note**: Each message must have **either** `body` OR `contentSid` (not both).

**Response** `200 OK`:
```json
{
  "success": true,
  "campaignId": "campaign_123",
  "total": 2,
  "status": "queued"
}
```

**Flow**:
1. Creates Campaign record in database
2. Queues all messages to `messageQueue` (BullMQ)
3. Returns immediately
4. Message workers process in parallel (10x)

---

### Campaign History

```http
GET /campaign/history
```

**Response** `200 OK`:
```json
{
  "campaigns": [
    {
      "id": "campaign_123",
      "name": "Black Friday Campaign",
      "templateSid": null,
      "channel": "whatsapp",
      "total": 2,
      "sent": 2,
      "failed": 0,
      "status": "done",
      "createdAt": "2026-02-03T10:00:00.000Z",
      "userId": "user_123"
    }
  ]
}
```

---

### Get Campaign Details

```http
GET /campaign/:id
```

**Response** `200 OK`:
```json
{
  "id": "campaign_123",
  "name": "Black Friday Campaign",
  "channel": "whatsapp",
  "total": 100,
  "sent": 95,
  "failed": 5,
  "status": "running",
  "createdAt": "2026-02-03T10:00:00.000Z"
}
```

---

### Delete Campaign

```http
DELETE /campaign/:id
```

**Response** `200 OK`:
```json
{
  "ok": true
}
```

---

## Messages

### Send Single Message

```http
POST /messages
```

**Request Body** (text message):
```json
{
  "to": "+5541991234567",
  "body": "Hello from InituCastt!",
  "channel": "whatsapp"
}
```

**Request Body** (template message):
```json
{
  "to": "+5541991234567",
  "contentSid": "CT1234567890abcdef",
  "variables": {
    "1": "João",
    "2": "123456"
  },
  "channel": "whatsapp"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "sid": "SM1234567890abcdef",
  "status": "queued",
  "to": "+5541991234567"
}
```

**Validation**:
- Phone: E.164 format required (e.g., `+5541991234567`)
- Body: Max 1600 characters
- ContentSid: Must match pattern `CT[a-z0-9]{32}`
- Must provide **either** `body` OR `contentSid` (not both)

---

## Templates

### Validate Template

Use AI to validate template compliance with Meta policies.

```http
POST /templates/validate
```

**Request Body**:
```json
{
  "template": "Olá {{1}}, sua compra foi aprovada! Código: {{2}}. Responda PARE para cancelar."
}
```

**Response** `200 OK`:
```json
{
  "approved": true,
  "suggestions": [],
  "issues": [],
  "category": "transactional"
}
```

**Response** `200 OK` (with issues):
```json
{
  "approved": false,
  "suggestions": [
    "Add clear opt-out instructions",
    "Remove promotional language"
  ],
  "issues": [
    "Contains promotional keywords: 'desconto', 'promoção'",
    "Missing opt-out instructions"
  ],
  "category": "promotional"
}
```

---

### List Twilio Templates

```http
GET /templates
```

**Response** `200 OK`:
```json
{
  "templates": [
    {
      "sid": "CT1234567890abcdef",
      "friendlyName": "order_confirmation",
      "types": {
        "whatsapp": {
          "body": "Olá {{1}}, seu pedido {{2}} foi confirmado!"
        }
      },
      "language": "pt_BR"
    }
  ]
}
```

---

## Webhooks

### Inbound Message (Twilio)

Receives incoming WhatsApp/SMS messages.

```http
POST /inbound
Content-Type: application/x-www-form-urlencoded
X-Twilio-Signature: <signature>
```

**Form Data**:
```
From=whatsapp:+5541991234567
Body=Sim, aceito
MessageSid=SM1234567890abcdef
```

**Behavior**:
1. Validates Twilio signature
2. Finds waiting contact by phone
3. Updates contact with `lastInbound`
4. Changes contact state to `waiting-inbound`
5. Flow worker resumes processing

**Response** `200 OK`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Security**:
- Validates `X-Twilio-Signature` header
- Rejects requests without valid signature

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "details": []  // Optional, for validation errors
}
```

### HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error or invalid request
- `401 Unauthorized`: Missing or invalid auth token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Errors

**Rate Limit Exceeded** `429`:
```json
{
  "error": "Too many requests, please try again later."
}
```

**Validation Error** `400`:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "phone",
      "message": "Phone number must be in E.164 format"
    }
  ]
}
```

**Unauthorized** `401`:
```json
{
  "error": "Access token required"
}
```

**Not Found** `404`:
```json
{
  "error": "Journey not found"
}
```

**Twilio Error** `500`:
```json
{
  "error": "Twilio API error: Invalid 'To' Phone Number"
}
```

---

## Rate Limiting

Different rate limits apply to different endpoint groups:

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Auth endpoints | 5 requests | 15 minutes |
| Expensive ops (launch, send) | 10 requests | 15 minutes |
| Webhooks | 100 requests | 1 minute |

**Headers** (included in response):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1738612345
```

**When Exceeded**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "Too many requests, please try again later."
}
```

---

## Pagination

Not yet implemented. All list endpoints return full results (consider adding in future).

---

## Versioning

API is currently v1 (no version prefix in URL). Future versions will use:
```
/api/v2/journeys
```

---

## Postman Collection

Import [InituCastt.postman_collection.json](../postman/InituCastt.postman_collection.json) to test API endpoints.

---

## OpenAPI Specification

See [openapi.yaml](../openapi.yaml) for complete OpenAPI 3.0 specification (coming soon).

---

**Last Updated**: 2026-02-03
