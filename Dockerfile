# Multi-stage build for StudAI
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Setup backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy backend files and dependencies
COPY --from=backend-builder /app/server/node_modules ./server/node_modules
COPY server ./server

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy ecosystem config
COPY ecosystem.config.js ./

# Create uploads directory
RUN mkdir -p ./server/uploads/profile_pictures

# Create logs directory
RUN mkdir -p ./logs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
