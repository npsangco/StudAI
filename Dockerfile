# Multi-stage build for StudAI
# Stage 1: Build frontend
FROM node:22-slim AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./

# Remove package-lock and install fresh
RUN rm -f package-lock.json && npm install --legacy-peer-deps

# Copy frontend source
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Setup backend
FROM node:22-slim AS backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Remove package-lock and install fresh
RUN rm -f package-lock.json && npm install --only=production --legacy-peer-deps

# Stage 3: Production image
FROM node:22-slim

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
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "import('http').then(http => http.default.get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1)))"

# Start the application directly
CMD ["node", "server/server.js"]
