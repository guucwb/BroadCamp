# Deployment Guide

Complete guide for deploying InituCastt to production.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment-recommended)
- [Manual Deployment](#manual-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring & Logs](#monitoring--logs)
- [Backup & Recovery](#backup--recovery)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended) or Docker
- **Node.js**: 20.x or higher
- **PostgreSQL**: 14+ (with pg_trgm extension)
- **Redis**: 6+
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: 20GB+ SSD
- **Network**: Public IP or domain with SSL certificate

### External Services

- **Twilio Account**: For WhatsApp/SMS
  - WhatsApp Business API approved sender
  - SMS-capable phone number
  - Account SID and Auth Token

- **OpenAI Account** (optional): For template validation
  - API key with GPT-4 access

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/initucastt.git
cd initucastt
```

### 2. Environment Variables

Create `.env` files for backend:

```bash
# backend/.env
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # If password protected

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_SMS_NUMBER=+14155238886
TWILIO_MESSAGING_SERVICE_SID=your_service_sid

# OpenAI (optional)
OPENAI_API_KEY=sk-your-api-key

# Security
JWT_SECRET=your_super_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=24h

# Application
FRONTEND_URL=https://yourdomain.com
LOG_LEVEL=info

# Optional
DRY_RUN=false
```

**Security Notes**:
- ✅ Use strong, random `JWT_SECRET` (32+ characters)
- ✅ Never commit `.env` to git
- ✅ Use environment variable management (e.g., Doppler, AWS Secrets Manager)
- ✅ Rotate credentials regularly

---

## Docker Deployment (Recommended)

### 1. Install Docker

```bash
# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configure Environment

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit with your credentials
nano backend/.env
```

### 3. Build and Start

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Services Started**:
- `postgres` - PostgreSQL database (port 5432)
- `redis` - Redis queue (port 6379)
- `backend` - API server (port 3001)
- `worker-message` - Message worker (10x parallel)
- `worker-flow` - Flow worker
- `frontend` - React app with Nginx (port 3000)

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Optional: Seed data
docker-compose exec backend npm run db:seed
```

### 5. Access Application

- **Frontend**: http://your-server-ip:3000
- **API**: http://your-server-ip:3001
- **Health Check**: http://your-server-ip:3001/health

### 6. Production Mode

```bash
# Production docker-compose (excludes Prisma Studio)
docker-compose --profile production up -d

# SSL/HTTPS setup (see Nginx section below)
```

---

## Manual Deployment

### 1. Install Dependencies

```bash
# System packages (Ubuntu)
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx certbot python3-certbot-nginx

# PM2 (process manager)
sudo npm install -g pm2
```

### 2. PostgreSQL Setup

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE whatsapp_campaigns;
CREATE USER initucastt WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_campaigns TO initucastt;
\q

# Enable pg_trgm extension
sudo -u postgres psql whatsapp_campaigns
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://initucastt:your_password@localhost:5432/whatsapp_campaigns"
```

### 3. Redis Setup

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password (optional but recommended)
requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

### 4. Backend Setup

```bash
cd backend

# Install dependencies
npm ci --only=production

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Create logs directory
mkdir -p logs

# Test start
npm start
```

### 5. Start with PM2

```bash
# Backend API
pm2 start src/index.js --name initucastt-api

# Message Worker
pm2 start src/workers/messageWorker.js --name initucastt-worker-message

# Flow Worker
pm2 start src/workers/flowWorker.js --name initucastt-worker-flow

# Save PM2 configuration
pm2 save

# Auto-start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

### 6. Frontend Setup

```bash
cd frontend

# Install dependencies
npm ci

# Build production bundle
REACT_APP_API_URL=https://api.yourdomain.com npm run build

# Serve with Nginx (see below)
```

### 7. Nginx Configuration

```nginx
# /etc/nginx/sites-available/initucastt
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend (React)
    root /var/www/initucastt/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API (reverse proxy)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/initucastt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (cron)
sudo systemctl enable certbot.timer
```

---

## Production Checklist

### Security
- [ ] Strong `JWT_SECRET` set (32+ characters, random)
- [ ] PostgreSQL password protected
- [ ] Redis password protected (if exposed)
- [ ] Twilio/OpenAI credentials secured
- [ ] `.env` files not committed to git
- [ ] SSL/TLS configured (HTTPS)
- [ ] Firewall configured (UFW, iptables)
- [ ] Rate limiting enabled
- [ ] CORS configured with allowed origins only

### Database
- [ ] PostgreSQL 14+ installed
- [ ] Migrations applied (`npx prisma migrate deploy`)
- [ ] Backups configured (daily)
- [ ] Connection pooling configured
- [ ] Indexes created (automatic via Prisma)

### Application
- [ ] `NODE_ENV=production` set
- [ ] Frontend built with production API URL
- [ ] Workers running (message + flow)
- [ ] PM2 or Docker auto-restart enabled
- [ ] Logs configured (Winston to files)
- [ ] Health checks configured

### Monitoring
- [ ] Application logs monitored
- [ ] Error tracking (e.g., Sentry)
- [ ] Uptime monitoring (e.g., UptimeRobot)
- [ ] Database monitoring
- [ ] Redis monitoring
- [ ] Queue monitoring (BullMQ dashboard)

### Performance
- [ ] Nginx gzip compression enabled
- [ ] Static assets cached
- [ ] Database queries optimized
- [ ] Redis persistence configured
- [ ] Worker concurrency tuned

---

## Monitoring & Logs

### Application Logs

**Docker**:
```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f worker-message
docker-compose logs -f worker-flow

# Export logs
docker-compose logs backend > backend.log
```

**PM2**:
```bash
# View logs
pm2 logs initucastt-api
pm2 logs initucastt-worker-message

# Export logs
pm2 logs --json > logs.json
```

**Winston Logs** (in `backend/logs/`):
- `combined.log` - All logs
- `error.log` - Errors only

### Queue Monitoring

**BullMQ Board** (optional):
```bash
npm install -g @bull-board/api @bull-board/express

# Add to backend/src/index.js
```

**Redis CLI**:
```bash
redis-cli
KEYS bull:*
LLEN bull:messages:waiting
LLEN bull:flows:waiting
```

### Database Monitoring

```bash
# PostgreSQL stats
sudo -u postgres psql whatsapp_campaigns

SELECT COUNT(*) FROM "Run" WHERE status='running';
SELECT COUNT(*) FROM "Contact" WHERE state='waiting';
SELECT pg_size_pretty(pg_database_size('whatsapp_campaigns'));
```

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# Expected: {"status":"ok"}
```

### Error Tracking (Sentry)

```bash
npm install @sentry/node

# backend/src/index.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## Backup & Recovery

### Database Backups

**Automated Daily Backup**:
```bash
#!/bin/bash
# /usr/local/bin/backup-db.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="initucastt_$DATE.sql"

mkdir -p $BACKUP_DIR
pg_dump whatsapp_campaigns > $BACKUP_DIR/$FILENAME
gzip $BACKUP_DIR/$FILENAME

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

**Cron Schedule**:
```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/backup-db.sh
```

**Restore**:
```bash
gunzip backup.sql.gz
psql whatsapp_campaigns < backup.sql
```

### Redis Backups

Redis automatically saves to `/var/lib/redis/dump.rdb`.

**Manual Backup**:
```bash
redis-cli SAVE
cp /var/lib/redis/dump.rdb /backups/redis/dump_$(date +%Y%m%d).rdb
```

---

## Scaling

### Horizontal Scaling

**Add More Workers**:
```yaml
# docker-compose.yml
  worker-message-2:
    <<: *worker-message-config
    container_name: initucastt-worker-message-2

  worker-message-3:
    <<: *worker-message-config
    container_name: initucastt-worker-message-3
```

**Load Balancer** (multiple API instances):
```nginx
upstream backend {
    least_conn;
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

location /api/ {
    proxy_pass http://backend/api/;
}
```

### Vertical Scaling

**Increase Worker Concurrency**:
```javascript
// backend/src/workers/messageWorker.js
concurrency: 20  // Increase from 10
```

**Database Connection Pooling**:
```javascript
// backend/prisma/schema.prisma
datasource db {
  url = env("DATABASE_URL")
  connection_limit = 100
}
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

**Quick Checks**:

```bash
# Service status
docker-compose ps  # Docker
pm2 status         # PM2

# Database connection
psql -U initucastt -h localhost whatsapp_campaigns -c "SELECT 1"

# Redis connection
redis-cli ping

# API health
curl http://localhost:3001/health

# Check logs
docker-compose logs --tail=100 backend
pm2 logs initucastt-api --lines 100
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/initucastt/issues)
- **Slack**: #initucastt-support
- **Email**: support@yourdomain.com

---

**Last Updated**: 2026-02-03
