# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
ARG REACT_APP_API_URL=http://localhost:3001
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Create non-root user
RUN addgroup --system --gid 101 nginx && \
    adduser --system --no-create-home --uid 101 --ingroup nginx nginx || true

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
