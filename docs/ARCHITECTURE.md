# Architecture Documentation

System design and technical architecture of InituCastt.

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Patterns](#architecture-patterns)
- [Data Flow](#data-flow)
- [Component Design](#component-design)
- [Database Schema](#database-schema)
- [Queue System](#queue-system)
- [Security Architecture](#security-architecture)
- [Scalability](#scalability)

---

## System Overview

InituCastt is a distributed messaging system built with event-driven architecture using BullMQ job queues for high-throughput message processing.

### Tech Stack

```
Frontend:  React 18 + Material-UI + React Flow
Backend:   Node.js 20 + Express 4
Database:  PostgreSQL 14 (via Prisma ORM)
Queue:     Redis 6 + BullMQ
Messaging: Twilio WhatsApp/SMS API
AI:        OpenAI GPT-4 (template validation)
```

### High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Client (Browser)                           │
│  React + MUI + React Flow (Journey Builder)                   │
└────────────────────────┬──────────────────────────────────────┘
                         │ HTTPS/REST
┌────────────────────────▼──────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                      │
│  SSL/TLS Termination • Static Files • Load Balancing          │
└────┬───────────────────────────────────────────────────┬──────┘
     │                                                    │
     │ /api/*                                        Static Files
     │                                                    │
┌────▼────────────────────────────────────────────────────▼─────┐
│                    Express Backend (API)                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Routes → Middleware → Controllers → Services →       │   │
│  │  Repositories → Prisma → PostgreSQL                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Middleware Stack:                                             │
│    • Helmet (security headers)                                 │
│    • CORS (origin validation)                                  │
│    • Rate Limiting (express-rate-limit)                        │
│    • Validation (Joi schemas)                                  │
│    • Auth (JWT verification)                                   │
│    • Error Handler (centralized)                               │
│    • Logger (Winston structured logging)                       │
└─────────┬────────────────────────┬─────────────────────────────┘
          │                        │
          │ Prisma Client          │ BullMQ add()
          │                        │
┌─────────▼──────────┐   ┌─────────▼──────────────────────────┐
│    PostgreSQL      │   │          Redis                     │
│                    │   │  ┌──────────────┐  ┌────────────┐  │
│  • Journeys        │   │  │ messages     │  │ flows      │  │
│  • Runs            │   │  │ Queue        │  │ Queue      │  │
│  • Contacts        │   │  │ (waiting:50) │  │ (wait:2)   │  │
│  • MessageLogs     │   │  └──────────────┘  └────────────┘  │
│  • Campaigns       │   │                                    │
│  • Templates       │   │  Job States: waiting, active,      │
│  • Users           │   │  completed, failed, delayed        │
└────────────────────┘   └──────────┬─────────────────────────┘
                                    │
                                    │ Worker.process()
                    ┌───────────────┴───────────────┐
                    │                               │
          ┌─────────▼──────────┐        ┌──────────▼─────────┐
          │  Message Worker    │        │   Flow Worker      │
          │                    │        │                    │
          │  • Concurrency: 10 │        │  • Concurrency: 2  │
          │  • Rate: 50/sec    │        │  • Processes runs  │
          │  • Retry: 3x       │        │  • Queues messages │
          │  • Sends messages  │        │  • Updates state   │
          └─────────┬──────────┘        └────────────────────┘
                    │
                    │ HTTP API calls
          ┌─────────▼──────────┐        ┌──────────────────┐
          │  Twilio API        │        │   OpenAI API     │
          │  • WhatsApp        │        │   • Template     │
          │  • SMS             │        │     Validation   │
          └────────────────────┘        └──────────────────┘
```

---

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Routes Layer                       │
│  HTTP routing, request/response handling            │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│               Middleware Layer                      │
│  Auth, validation, rate limiting, error handling    │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│               Service Layer                         │
│  Business logic, orchestration, complex operations  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Repository Layer                       │
│  Data access abstraction, Prisma queries            │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 Database Layer                      │
│  PostgreSQL (Prisma ORM)                            │
└─────────────────────────────────────────────────────┘
```

**Benefits**:
- Clear separation of concerns
- Easy to test (mock layers)
- Reusable business logic
- Swappable data sources

### 2. Repository Pattern

Abstracts database operations:

```javascript
// repositories/journeyRepository.js
class JourneyRepository {
  async findAll(userId, filters) {
    return prisma.journey.findMany({
      where: { userId, ...filters },
      select: { id, name, status, createdAt }  // Optimize
    });
  }

  async create(data, userId) {
    return prisma.journey.create({
      data: { ...data, userId, status: 'draft' }
    });
  }
}
```

**Benefits**:
- Testable (mock repository)
- Centralized data access
- Consistent error handling
- Easy to optimize queries

### 3. Event-Driven Architecture

Uses BullMQ for asynchronous job processing:

```javascript
// Add job to queue (non-blocking)
await flowQueue.add('process-run', { runId, journeyId });

// Worker processes job (background)
flowWorker.on('completed', (job, result) => {
  logger.info('Run completed', { runId: result.runId });
});
```

**Benefits**:
- Decoupled components
- Scalable (add more workers)
- Fault tolerant (automatic retry)
- Non-blocking operations

### 4. Service Layer Pattern

Encapsulates business logic:

```javascript
// services/runService.js
class RunService {
  async createAndStartRun(flowId, userId, audience) {
    // 1. Load journey
    const journey = await journeyRepo.findById(flowId);

    // 2. Create run
    const run = await runRepo.create({ flowId, total: audience.length });

    // 3. Create contacts
    await runRepo.createContacts(runId, contacts);

    // 4. Queue for processing
    await flowQueue.add('process-run', { runId, journeyId });

    return run;
  }
}
```

**Benefits**:
- Reusable across routes
- Complex orchestration
- Easier to test
- Clear API

---

## Data Flow

### 1. Journey Launch Flow

```
User clicks "Launch"
  ↓
POST /api/journeys/:id/launch
  ↓
journeysRoutes.js → asyncHandler
  ↓
journeyRepo.findById(id) → PostgreSQL
  ↓
runRepo.create({ flowId, total }) → PostgreSQL
  ↓
runRepo.createContacts(runId, contacts) → PostgreSQL (bulk)
  ↓
flowQueue.add('process-run', { runId, journeyId }) → Redis
  ↓
Response: { ok: true, runId }
  ↓
                    [BACKGROUND]
                        ↓
flowWorker picks job from Redis
  ↓
processRun(runId, journeyId)
  ↓
runRepo.findById(runId, includeContacts=true) → PostgreSQL
  ↓
journeyRepo.findById(journeyId) → PostgreSQL
  ↓
For each contact:
  processContact(journey, run, contact)
    ↓
    For each node in journey:
      if (node.type === 'message'):
        messageQueue.add('send-message', { to, body, ... }) → Redis
      if (node.type === 'wait'):
        contact.state = 'waiting'
        break
    ↓
    runRepo.updateContact(contactId, { state, cursor, history })
  ↓
runRepo.update(runId, { processed, status })
```

### 2. Message Sending Flow

```
messageQueue.add() → Redis
  ↓
messageWorker picks job (1 of 10 workers)
  ↓
twilioService.sendWhatsApp({ to, body, contentSid, variables })
  ↓
Twilio API → WhatsApp
  ↓
prisma.messageLog.create({ phone, status, twilioSid }) → PostgreSQL
  ↓
Job marked as completed
  ↓
If failed → Retry (3x, exponential backoff 2s → 4s → 8s)
```

### 3. Inbound Message Flow

```
User replies on WhatsApp
  ↓
Twilio sends webhook
  ↓
POST /api/inbound (Twilio signature validation)
  ↓
runRepo.findAll(status='running') → PostgreSQL
  ↓
For each run:
  runRepo.findContactByPhone(runId, phone) → PostgreSQL
  ↓
  if (contact.state === 'waiting'):
    runRepo.updateContact(id, {
      lastInbound: { text, payload, timestamp },
      state: 'waiting-inbound'
    })
  ↓
flowWorker (already running) checks for 'waiting-inbound'
  ↓
resumeIfInbound(journey, run, contact)
  ↓
matchReply(conds, inbound.text, inbound.payload)
  ↓
contact.cursor = chosen.target
contact.state = 'active'
  ↓
processContact() continues from new node
```

---

## Component Design

### Backend Components

```
backend/
├── src/
│   ├── index.js                    # Express app setup
│   ├── routes/                     # HTTP endpoints
│   │   ├── journeysRoutes.js
│   │   ├── runsRoutes.js
│   │   ├── campaignRoutes.js
│   │   ├── messagesRoutes.js
│   │   └── inbound.js
│   ├── middleware/                 # Request processing
│   │   ├── auth.js                 # JWT verification
│   │   ├── validation.js           # Joi schemas
│   │   ├── rateLimiter.js          # Rate limiting
│   │   └── errorHandler.js         # Error handling
│   ├── services/                   # Business logic
│   │   ├── twilioService.js        # Twilio API wrapper
│   │   ├── runService.js           # Run orchestration
│   │   └── openaiService.js        # OpenAI integration
│   ├── repositories/               # Data access
│   │   ├── journeyRepository.js
│   │   ├── runRepository.js
│   │   └── userRepository.js
│   ├── queues/                     # BullMQ setup
│   │   ├── messageQueue.js         # Queue definitions
│   │   └── flowQueue.js
│   ├── workers/                    # Background jobs
│   │   ├── messageWorker.js        # Sends messages
│   │   └── flowWorker.js           # Processes runs
│   ├── utils/                      # Utilities
│   │   └── logger.js               # Winston logger
│   └── prisma/                     # Database
│       └── schema.prisma
```

### Frontend Components

```
frontend/
├── src/
│   ├── components/
│   │   ├── JourneyBuilder/         # React Flow editor
│   │   │   ├── JourneyCanvas.jsx
│   │   │   ├── nodes/              # Custom node types
│   │   │   └── edges/
│   │   ├── CampaignManager/        # Campaign UI
│   │   ├── UploadCSV/              # CSV upload
│   │   └── TemplateValidator/      # AI validation UI
│   ├── pages/
│   │   ├── JourneysPage.jsx
│   │   ├── RunsPage.jsx
│   │   └── CampaignsPage.jsx
│   ├── services/
│   │   └── api.js                  # Axios API client
│   └── context/
│       └── AuthContext.jsx         # User state
```

---

## Database Schema

### Entity-Relationship Diagram

```
User
├── id (PK)
├── email (unique)
├── password (hashed)
├── name
├── role
└── createdAt

Journey
├── id (PK)
├── name
├── nodes (JSON)
├── edges (JSON)
├── status
├── userId (FK → User)
├── createdAt
└── updatedAt

Run
├── id (PK)
├── flowId
├── flowName
├── status (queued|running|done|failed|stopped)
├── total
├── processed
├── journeyId (FK → Journey)
├── userId (FK → User)
├── startedAt
├── endedAt
├── error
└── createdAt

Contact
├── id (PK)
├── runId (FK → Run)
├── phone
├── vars (JSON)
├── cursor (current node ID)
├── state (active|waiting|waiting-inbound|done)
├── history (JSON array)
├── lastInbound (JSON)
└── wait (JSON)

Campaign
├── id (PK)
├── name
├── templateSid
├── channel
├── total
├── sent
├── failed
├── status
├── userId (FK → User)
└── createdAt

MessageLog
├── id (PK)
├── phone
├── body
├── contentSid
├── twilioSid
├── status
├── error
├── runId (FK → Run, optional)
├── campaignId (FK → Campaign, optional)
└── createdAt

Template
├── id (PK)
├── name
├── content
├── variables (JSON)
├── category
├── approved
├── userId (FK → User)
└── createdAt
```

### Indexes

```sql
-- Journeys
CREATE INDEX "Journey_userId_idx" ON "Journey"("userId");
CREATE INDEX "Journey_status_idx" ON "Journey"("status");

-- Runs
CREATE INDEX "Run_journeyId_idx" ON "Run"("journeyId");
CREATE INDEX "Run_userId_idx" ON "Run"("userId");
CREATE INDEX "Run_status_idx" ON "Run"("status");

-- Contacts
CREATE INDEX "Contact_runId_idx" ON "Contact"("runId");
CREATE INDEX "Contact_phone_idx" ON "Contact"("phone");
CREATE INDEX "Contact_state_idx" ON "Contact"("state");

-- MessageLogs
CREATE INDEX "MessageLog_runId_idx" ON "MessageLog"("runId");
CREATE INDEX "MessageLog_campaignId_idx" ON "MessageLog"("campaignId");
CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");
```

---

## Queue System

### BullMQ Architecture

```
┌────────────────────────────────────────────────────┐
│                    Redis                           │
│                                                    │
│  bull:messages:waiting          (List)            │
│  bull:messages:active           (List)            │
│  bull:messages:completed        (ZSet)            │
│  bull:messages:failed           (ZSet)            │
│  bull:messages:delayed          (ZSet)            │
│  bull:messages:jobs:1           (Hash - job data) │
│  bull:messages:jobs:2           (Hash - job data) │
│  ...                                               │
│                                                    │
│  bull:flows:waiting             (Same structure)  │
│  bull:flows:active                                │
│  ...                                               │
└────────────────────────────────────────────────────┘
         ↑                    ↑
         │ add()              │ process()
         │                    │
┌────────┴─────┐      ┌───────┴──────────┐
│  API Server  │      │     Workers      │
│              │      │  (10 message)    │
│ Queue.add()  │      │  (2 flow)        │
└──────────────┘      └──────────────────┘
```

### Job Lifecycle

```
1. Created → waiting
2. Worker picks → active
3. Processing...
4a. Success → completed (TTL: 1h, keep last 100)
4b. Failure → failed (retry with backoff)
5. Max retries → failed (TTL: 24h, keep last 1000)
```

### Retry Strategy

**Message Queue**:
- Attempts: 3
- Backoff: Exponential
- Delays: 2s → 4s → 8s

**Flow Queue**:
- Attempts: 2
- Backoff: Fixed
- Delay: 5s

---

## Security Architecture

### 1. Authentication Flow

```
User submits login
  ↓
POST /api/auth/login { email, password }
  ↓
userRepo.findByEmail(email)
  ↓
bcrypt.compare(password, user.password)
  ↓
jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '24h' })
  ↓
Response: { token, user }

Subsequent requests:
  ↓
Authorization: Bearer <token>
  ↓
authenticateToken() middleware
  ↓
jwt.verify(token, JWT_SECRET)
  ↓
req.user = decoded
  ↓
Route handler
```

### 2. Input Validation

```javascript
// Joi schema
const schema = Joi.object({
  phone: Joi.string().pattern(/^\+?\d{10,15}$/),
  body: Joi.string().max(1600)
}).xor('body', 'contentSid');

// Middleware
validate('sendMessage')(req, res, next);
```

### 3. Rate Limiting

```javascript
// express-rate-limit
apiLimiter: 100 req / 15 min
authLimiter: 5 req / 15 min
strictLimiter: 10 req / 15 min
```

### 4. Webhook Security

```javascript
// Twilio signature validation
const isValid = twilio.validateRequest(
  authToken,
  req.headers['x-twilio-signature'],
  url,
  req.body
);
if (!isValid) return res.status(403);
```

---

## Scalability

### Horizontal Scaling

**Workers**:
- Add more messageWorker instances (elastic scaling)
- Each worker processes 10 messages in parallel
- Total throughput = workers × 10 × 50 msg/sec

**API Servers**:
- Stateless (can add behind load balancer)
- Session stored in JWT (no server-side session)

**Database**:
- Read replicas for reporting
- Connection pooling (Prisma)
- Sharding by userId (future)

### Vertical Scaling

**Increase Concurrency**:
```javascript
messageWorker: { concurrency: 20 }  // 2x throughput
flowWorker: { concurrency: 4 }      // 2x throughput
```

**Database**:
- Increase connection pool
- Add more CPU/RAM
- Use faster storage (NVMe SSD)

### Performance Optimizations

1. **Query Optimization**: Use Prisma `select` to load only needed fields
2. **Indexes**: On frequently queried fields (userId, status, state)
3. **Caching**: Redis cache for frequently accessed data (future)
4. **CDN**: Static frontend assets via CDN
5. **Compression**: Gzip for HTTP responses

---

**Last Updated**: 2026-02-03
