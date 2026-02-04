# backend/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --production && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/package.json ./package.json

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create directories
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs logs uploads

# Switch to nodejs user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command (can be overridden in docker-compose)
CMD ["npm", "start"]
