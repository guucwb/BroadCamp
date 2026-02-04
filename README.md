# InituCastt - WhatsApp Campaign Dispatcher

<div align="center">

**Sistema profissional de disparo de campanhas via WhatsApp/SMS com journey builder visual**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6+-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

InituCastt é uma plataforma completa para criação e execução de campanhas de mensagens via WhatsApp e SMS. Com um journey builder visual baseado em React Flow, você pode criar fluxos complexos de comunicação com seus contatos.

### ✨ Key Features

- 🎨 **Journey Builder Visual** - Arraste e solte nós para criar fluxos
- 📊 **Upload CSV** - Importe listas de contatos facilmente
- 🤖 **AI Policy Validation** - Validação automática de templates com OpenAI
- 📱 **WhatsApp & SMS** - Suporte para ambos os canais via Twilio
- ⚡ **High Performance** - Processamento paralelo com BullMQ (10x mais rápido)
- 🔒 **Security First** - JWT auth, rate limiting, input validation
- 📈 **Real-time Monitoring** - Acompanhe suas campanhas em tempo real
- 🗄️ **PostgreSQL + Redis** - Banco de dados robusto e fila de jobs
- 🐳 **Docker Ready** - Deploy com um comando
- 🧪 **Tested** - Infraestrutura completa de testes com Jest

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14+
- Redis 6+
- Twilio Account (WhatsApp/SMS)
- OpenAI API Key (optional, for template validation)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/initucastt.git
cd initucastt

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Database setup
npx prisma migrate deploy
npm run db:seed  # Optional: migrate existing JSON data

# Start backend
npm run dev  # Starts API + Workers + Frontend

# Or start components individually:
npm start                # API only
npm run workers          # Workers only (message + flow)
npm run worker:message   # Message worker only
npm run worker:flow      # Flow worker only
```

### Docker (Recommended)

```bash
# Start everything (PostgreSQL, Redis, Backend, Workers, Frontend)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  Journey Builder • Campaign Manager • Template Validator        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────────┐
│                      Backend (Express)                          │
│  Routes • Middleware • Repositories • Services                  │
├─────────────────────────┬───────────────────────────────────────┤
│                         │                                       │
│  ┌──────────────────────▼─────────────┐   ┌──────────────────┐ │
│  │        PostgreSQL                  │   │      Redis       │ │
│  │  Journeys • Runs • Contacts        │   │   BullMQ Queues  │ │
│  └────────────────────────────────────┘   └──────────┬───────┘ │
│                                                       │         │
└───────────────────────────────────────────────────────┼─────────┘
                                                        │
                          ┌─────────────────────────────▼─────────┐
                          │           Workers                     │
                          │  • Message Worker (10x parallel)      │
                          │  • Flow Worker (journey processing)   │
                          └─────────────┬─────────────────────────┘
                                        │
                          ┌─────────────▼─────────────┐
                          │    External APIs          │
                          │  • Twilio (WhatsApp/SMS)  │
                          │  • OpenAI (validation)    │
                          └───────────────────────────┘
```

**Flow Execution**:
```
User creates journey → Launch → Create Run → Queue to flowQueue
                                                     ↓
                                              flowWorker processes
                                                     ↓
                                         Queue messages to messageQueue
                                                     ↓
                                         messageWorker sends (10 parallel)
                                                     ↓
                                              Twilio API → WhatsApp
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

---

## 📚 Documentation

### User Guides
- [API Documentation](docs/API.md) - Complete API reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

### Developer Guides
- [Architecture](docs/ARCHITECTURE.md) - System design and patterns
- [Contributing](CONTRIBUTING.md) - How to contribute
- [Phase Documentation](backend/) - Implementation phase details
  - [Phase 1: Security](backend/README_PHASE1.md)
  - [Phase 2: PostgreSQL](backend/README_PHASE2.md)
  - [Phase 3: BullMQ](backend/README_PHASE3.md)
  - [Phase 4: Testing](backend/README_PHASE4.md)

---

## 🎯 Features in Detail

### Journey Builder

Create complex message flows with:
- **Audience Node**: Define your target contacts
- **Message Node**: Send WhatsApp/SMS with variable substitution
- **Wait Node**: Wait for user response with conditional routing
- **Delay Node**: Schedule messages or wait for specific time
- **API Node**: Fetch external data (coming soon)
- **End Node**: Complete the journey

**Variable Substitution**:
```
Message: "Hello {{name}}, your order {{orderId}} is ready!"
Contact: { name: "John", orderId: "12345" }
Result: "Hello John, your order 12345 is ready!"
```

### Template Validation

AI-powered validation ensures your templates comply with Meta's WhatsApp policies:
- ✅ No promotional content in transactional templates
- ✅ No misleading information
- ✅ Clear opt-out instructions
- ✅ Professional tone

### Campaign Management

- Upload contacts via CSV
- Map CSV columns to variables
- Real-time progress tracking
- Export campaign results
- Retry failed messages

### Performance

**Before (Phase 2)**:
- Sequential message sending
- 120 messages/minute
- Polling-based (constant CPU)

**After (Phase 3)**:
- Parallel processing (10 workers)
- 1200 messages/minute
- Event-driven (on-demand CPU)
- **10x faster** 🚀

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express 4.x
- **Database**: PostgreSQL 14+ (Prisma ORM)
- **Queue**: Redis + BullMQ
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Messaging**: Twilio SDK
- **AI**: OpenAI API
- **Logging**: Winston
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: React 18.x
- **UI**: Material-UI (MUI)
- **Flow Editor**: React Flow
- **State**: React Context + Hooks
- **CSV**: PapaParse
- **HTTP**: Axios

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database Migrations**: Prisma Migrate
- **Process Manager**: PM2 (production)
- **Reverse Proxy**: Nginx (frontend)

---

## 📊 API Overview

Base URL: `http://localhost:3001/api`

### Journeys
```http
GET    /journeys           # List all journeys
GET    /journeys/:id       # Get journey by ID
POST   /journeys           # Create new journey
PUT    /journeys/:id       # Update journey
DELETE /journeys/:id       # Delete journey
POST   /journeys/:id/duplicate  # Duplicate journey
POST   /journeys/:id/launch     # Launch journey (start run)
```

### Runs
```http
GET    /runs               # List all runs
GET    /runs/:id           # Get run by ID
GET    /runs/:id/stats     # Get run statistics
GET    /runs/:id/export    # Export run as CSV
DELETE /runs/:id           # Delete run
POST   /runs/:id/stop      # Stop running run
```

### Campaigns
```http
POST   /campaign/upload    # Upload CSV
POST   /campaign/send      # Send campaign (bulk messages)
GET    /campaign/history   # Campaign history
GET    /campaign/:id       # Get campaign details
DELETE /campaign/:id       # Delete campaign
```

### Messages
```http
POST   /messages           # Send single message
```

### Templates
```http
POST   /templates/validate # Validate template with AI
GET    /templates          # List Twilio templates
```

See [docs/API.md](docs/API.md) for complete API documentation with examples.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

**Current Coverage**:
- Helpers/Utilities: ~90%
- Repositories: ~60%
- Routes: ~40%
- **Overall**: ~50% (target: 70%)

---

## 🔒 Security

InituCastt implements security best practices:

- ✅ **Authentication**: JWT with bcrypt password hashing
- ✅ **Authorization**: User-based resource access control
- ✅ **Rate Limiting**: Prevents brute force and DoS attacks
- ✅ **Input Validation**: Joi schemas for all endpoints
- ✅ **CORS**: Configured for allowed origins only
- ✅ **Helmet**: Security headers (XSS, clickjacking, etc.)
- ✅ **Webhook Validation**: Twilio signature verification
- ✅ **Secrets Management**: Environment variables, not committed
- ✅ **SQL Injection**: Prisma ORM prevents SQL injection
- ✅ **Error Handling**: No stack traces in production

---

## 🚢 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET` (minimum 32 characters)
- [ ] Configure production `DATABASE_URL`
- [ ] Set up Redis with password (`REDIS_URL`)
- [ ] Add real Twilio credentials
- [ ] Set `NODE_ENV=production`
- [ ] Configure `FRONTEND_URL` for CORS
- [ ] Set up SSL/TLS (HTTPS)
- [ ] Configure Nginx reverse proxy
- [ ] Set up PM2 for process management
- [ ] Configure database backups
- [ ] Set up monitoring (e.g., Sentry, DataDog)
- [ ] Configure log rotation

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment guide.

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_SMS_NUMBER=+14155238886

# OpenAI (optional)
OPENAI_API_KEY=sk-...

# Security
JWT_SECRET=your_super_secret_key_minimum_32_chars
JWT_EXPIRES_IN=24h

# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
LOG_LEVEL=info

# Optional
DRY_RUN=false  # Set to true to test without sending
```

---

## 📈 Performance

### Benchmarks

**Message Throughput**:
- Sequential (Phase 2): 120 msg/min
- Parallel (Phase 3): **1200 msg/min** (10x improvement)

**Journey Processing**:
- Runs processed: 2 in parallel
- Contacts per run: Unlimited
- Messages per contact: Unlimited

**Database Performance**:
- PostgreSQL with indexes on key fields
- Connection pooling via Prisma
- Optimized queries with `select` (only needed fields)

**Queue Performance**:
- Message queue: 50 jobs/second rate limit
- Flow queue: 10 jobs/second rate limit
- Automatic retry with exponential backoff
- Job cleanup (completed: 100, failed: 1000)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/yourusername/initucastt.git
cd initucastt

# 2. Create branch
git checkout -b feature/my-feature

# 3. Make changes
# ... code ...

# 4. Format and lint
npm run format
npm run lint:fix

# 5. Test
npm test

# 6. Commit
git add .
git commit -m "feat: add my feature"

# 7. Push and create PR
git push origin feature/my-feature
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding tests
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `chore:` Maintenance tasks

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

Built with:
- [React Flow](https://reactflow.dev/) - Visual flow builder
- [Twilio](https://www.twilio.com/) - WhatsApp/SMS API
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [BullMQ](https://docs.bullmq.io/) - Job queue system
- [Material-UI](https://mui.com/) - React UI framework
- [OpenAI](https://openai.com/) - AI-powered validation

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/initucastt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/initucastt/discussions)
- **Email**: support@yourdomain.com

---

<div align="center">

**Made with ❤️ by the InituCastt Team**

[⬆ Back to Top](#initucastt---whatsapp-campaign-dispatcher)

</div>
