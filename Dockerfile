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

# Copy backend files and dependencies
COPY --from=backend-builder /app/server/node_modules ./server/node_modules
COPY server ./server

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p ./server/uploads/profile_pictures

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application directly
CMD ["node", "server/server.js"]
