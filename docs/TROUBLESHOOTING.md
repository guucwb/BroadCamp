# Troubleshooting Guide

Common issues and solutions for InituCastt.

---

## Table of Contents

- [Application Won't Start](#application-wont-start)
- [Database Issues](#database-issues)
- [Redis & Queue Issues](#redis--queue-issues)
- [Messages Not Sending](#messages-not-sending)
- [Webhook Issues](#webhook-issues)
- [Performance Problems](#performance-problems)
- [Docker Issues](#docker-issues)
- [Frontend Issues](#frontend-issues)

---

## Application Won't Start

### Error: "Cannot find module '@prisma/client'"

**Cause**: Prisma Client not generated.

**Solution**:
```bash
cd backend
npx prisma generate
npm start
```

---

### Error: "EADDRINUSE: address already in use :::3001"

**Cause**: Port 3001 already in use.

**Solution**:
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

---

### Error: "Error: listen EACCES: permission denied 0.0.0.0:80"

**Cause**: Port 80 requires root permissions.

**Solution**:
```bash
# Use port > 1024
PORT=3001

# Or run with sudo (not recommended)
sudo npm start

# Or use authbind (Linux)
authbind --deep npm start
```

---

## Database Issues

### Error: "Can't reach database server at `localhost:5432`"

**Cause**: PostgreSQL not running or wrong connection string.

**Check**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS
docker-compose ps postgres  # Docker

# Test connection
psql -U postgres -h localhost -p 5432 -c "SELECT 1"
```

**Solutions**:
```bash
# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS
docker-compose up -d postgres  # Docker

# Check DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

---

### Error: "Schema engine error: Migration failed to apply cleanly to the shadow database"

**Cause**: Schema mismatch or missing extension.

**Solution**:
```bash
# Drop shadow database
psql -U postgres -c "DROP DATABASE IF EXISTS whatsapp_campaigns_shadow"

# Apply migrations
npx prisma migrate deploy

# If still fails, reset (⚠️  DESTROYS DATA)
npx prisma migrate reset
```

---

### Error: "Unique constraint failed on the fields: (`email`)"

**Cause**: Trying to create user with existing email.

**Solution**:
```bash
# Check existing users
psql whatsapp_campaigns -c "SELECT id, email FROM \"User\""

# Delete duplicate (if safe)
psql whatsapp_campaigns -c "DELETE FROM \"User\" WHERE email='duplicate@example.com'"
```

---

### Slow Queries

**Check**:
```sql
-- Enable query logging (PostgreSQL)
ALTER DATABASE whatsapp_campaigns SET log_statement = 'all';

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Solutions**:
- Add indexes on frequently queried columns
- Use Prisma `select` to load only needed fields
- Increase connection pool size in `schema.prisma`

---

## Redis & Queue Issues

### Error: "Error: connect ECONNREFUSED 127.0.0.1:6379"

**Cause**: Redis not running.

**Solution**:
```bash
# Start Redis
sudo systemctl start redis  # Linux
brew services start redis  # macOS
docker-compose up -d redis  # Docker

# Test connection
redis-cli ping
# Expected: PONG
```

---

### Jobs Stuck in "waiting" State

**Check**:
```bash
redis-cli
LLEN bull:messages:waiting
LLEN bull:messages:active
LLEN bull:flows:waiting
```

**Solutions**:
```bash
# 1. Check if workers are running
pm2 status  # PM2
docker-compose ps  # Docker

# 2. Restart workers
pm2 restart initucastt-worker-message
pm2 restart initucastt-worker-flow

# 3. Clear stuck jobs (⚠️  LOSES DATA)
redis-cli FLUSHALL
```

---

### Jobs Failing with "Maximum call stack size exceeded"

**Cause**: Circular reference in job data.

**Solution**:
```javascript
// Don't pass entire objects with circular refs
// BAD:
await messageQueue.add('send', { contact });

// GOOD:
await messageQueue.add('send', {
  phone: contact.phone,
  vars: contact.vars
});
```

---

### Redis Memory Full

**Check**:
```bash
redis-cli INFO memory
```

**Solutions**:
```bash
# 1. Increase maxmemory in redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru

# 2. Clear completed jobs
redis-cli
SCAN 0 MATCH bull:*:completed* COUNT 1000
# For each key: DEL <key>

# 3. Reduce job retention
// messageQueue.js
removeOnComplete: { count: 10 }  // Keep only last 10
removeOnFail: { count: 50 }
```

---

## Messages Not Sending

### Error: "Twilio API error: Invalid 'To' Phone Number"

**Cause**: Phone number not in E.164 format.

**Solution**:
```javascript
// Format phone numbers
const phone = '+5541991234567';  // ✅ Correct
const phone = '41991234567';     // ❌ Wrong
const phone = '+55 (41) 99123-4567';  // ❌ Wrong
```

---

### Error: "Twilio API error: Unable to create record: The 'From' number is not a valid WhatsApp-enabled phone number"

**Cause**: Twilio number not WhatsApp-enabled.

**Check**:
1. Go to Twilio Console → Messaging → Senders
2. Verify WhatsApp sender is approved
3. Check `TWILIO_WHATSAPP_NUMBER` in .env

**Solution**:
```bash
# .env
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Must have "whatsapp:" prefix
```

---

### Messages Sending Too Slowly

**Check**:
```bash
# Queue metrics
redis-cli
LLEN bull:messages:waiting
LLEN bull:messages:active

# Worker logs
docker-compose logs worker-message
pm2 logs initucastt-worker-message
```

**Solutions**:
```javascript
// 1. Increase worker concurrency
// messageWorker.js
concurrency: 20  // From 10

// 2. Add more workers
docker-compose up -d --scale worker-message=3

// 3. Increase rate limit (if Twilio allows)
limiter: { max: 100, duration: 1000 }  // 100/sec
```

---

### DRY_RUN Mode Not Working

**Check**:
```bash
# .env
DRY_RUN=true  # Must be exactly 'true' (lowercase)
```

**Verify**:
```javascript
console.log(process.env.DRY_RUN);  // Should print 'true'
console.log(process.env.DRY_RUN === 'true');  // Should print true
```

---

## Webhook Issues

### Webhooks Not Being Received

**Check**:
1. Twilio Console → Messaging → WhatsApp senders → Sandbox/Production
2. Verify webhook URL: `https://yourdomain.com/api/inbound`
3. Check webhook logs in Twilio Console

**Common Issues**:
```bash
# 1. Firewall blocking port
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 2. Nginx not proxying
# Check /etc/nginx/sites-available/initucastt
location /api/inbound {
    proxy_pass http://localhost:3001/api/inbound;
}

# 3. SSL certificate expired
sudo certbot renew
```

**Test Webhook Locally** (ngrok):
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3001

# Use ngrok URL in Twilio Console
https://abc123.ngrok.io/api/inbound
```

---

### Error: "Webhook signature validation failed"

**Cause**: Invalid Twilio signature or URL mismatch.

**Check**:
```javascript
// Log signature validation details
console.log('URL:', url);
console.log('Signature:', req.headers['x-twilio-signature']);
console.log('Body:', req.body);
```

**Solutions**:
```bash
# 1. Ensure URL matches exactly (http vs https, trailing slash)
# Twilio: https://yourdomain.com/api/inbound
# Code: Must construct same URL

# 2. Check if behind proxy
# Express needs: app.set('trust proxy', true)

# 3. Disable validation (ONLY for testing!)
// TEMPORARILY comment out validation
// if (!isValid) return res.status(403)
```

---

## Performance Problems

### High CPU Usage

**Check**:
```bash
# Top processes
htop
docker stats  # Docker

# Node.js profiling
node --prof src/index.js
```

**Common Causes**:
1. Too many workers running
2. Infinite loops in journey
3. Slow database queries
4. Large JSON payloads

**Solutions**:
```bash
# 1. Reduce worker concurrency
concurrency: 5  # Instead of 10

# 2. Add safety limit to journey processing
// flowWorker.js
let safety = 0;
while (contact.state === 'active' && safety < 100) {
  safety++;
  // ...
}

# 3. Optimize queries with indexes
```

---

### High Memory Usage

**Check**:
```bash
# Memory usage
free -h  # Linux
docker stats  # Docker

# Node.js heap
node --max-old-space-size=4096 src/index.js
```

**Solutions**:
```bash
# 1. Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096"

# 2. Reduce job payload size
// Don't store entire contact history in job
data: {
  contactId: contact.id,  // ✅ Store ID
  // contact: contact     // ❌ Don't store entire object
}

# 3. Clear logs
rm -rf logs/*.log
```

---

### Database Connection Pool Exhausted

**Error**: "Can't reach database server: too many connections"

**Solution**:
```javascript
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection limit
  connection_limit = 100
}
```

**PostgreSQL**:
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Increase max connections
-- /etc/postgresql/14/main/postgresql.conf
max_connections = 200

-- Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Docker Issues

### Error: "Cannot connect to the Docker daemon"

**Cause**: Docker not running.

**Solution**:
```bash
# Start Docker
sudo systemctl start docker  # Linux
# Or open Docker Desktop  # macOS/Windows

# Check status
docker ps
```

---

### Error: "Port is already allocated"

**Cause**: Another container using the same port.

**Solution**:
```bash
# Find container using port
docker ps -a | grep 5432

# Stop container
docker stop <container_id>

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

---

### Containers Restarting Constantly

**Check Logs**:
```bash
docker-compose logs backend
docker-compose logs worker-message
```

**Common Causes**:
1. Database not ready (healthcheck failing)
2. Missing environment variables
3. Application crashing

**Solution**:
```yaml
# docker-compose.yml
# Add depends_on with condition
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
```

---

### Build Failed: "ENOSPC: System limit for number of file watchers reached"

**Cause**: inotify limit too low (Linux).

**Solution**:
```bash
# Increase inotify limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Frontend Issues

### Blank Page After Build

**Check**:
```bash
# Browser console (F12)
# Look for errors

# Check REACT_APP_API_URL
echo $REACT_APP_API_URL
```

**Solutions**:
```bash
# 1. Rebuild with correct API URL
REACT_APP_API_URL=https://api.yourdomain.com npm run build

# 2. Check nginx config
# Should serve index.html for all routes
try_files $uri $uri/ /index.html;
```

---

### CORS Errors

**Error**: "Access to fetch at 'http://localhost:3001/api/journeys' from origin 'http://localhost:3000' has been blocked by CORS policy"

**Solution**:
```javascript
// backend/src/index.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// .env
FRONTEND_URL=http://localhost:3000  # Development
FRONTEND_URL=https://yourdomain.com  # Production
```

---

### Journey Builder Not Loading

**Check**:
```bash
# Browser console for errors
# Network tab for failed requests

# Check if React Flow is installed
npm list react-flow-renderer
```

**Solutions**:
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## General Debugging

### Enable Verbose Logging

```bash
# .env
LOG_LEVEL=debug
NODE_ENV=development
```

### Check System Resources

```bash
# CPU, Memory, Disk
htop
df -h
free -h

# Docker
docker stats
```

### Health Checks

```bash
# API
curl http://localhost:3001/health

# PostgreSQL
psql -U postgres -c "SELECT 1"

# Redis
redis-cli ping

# Workers (check logs for "Worker started")
docker-compose logs worker-message | grep "started"
```

---

## Getting Help

If none of these solutions work:

1. **Check Logs**:
   ```bash
   # Application logs
   tail -f backend/logs/error.log
   docker-compose logs -f backend

   # System logs
   journalctl -u postgresql -f
   journalctl -u redis -f
   ```

2. **Search Issues**: [GitHub Issues](https://github.com/yourusername/initucastt/issues)

3. **Create Issue**: Include:
   - OS and versions (Node.js, PostgreSQL, Redis)
   - Full error message and stack trace
   - Steps to reproduce
   - Relevant logs
   - Environment variables (redact secrets!)

4. **Contact Support**: support@yourdomain.com

---

**Last Updated**: 2026-02-03
