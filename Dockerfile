# Multi-stage build for production optimization

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS production
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install all dependencies (including tsx for TypeScript execution)
RUN npm ci

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source
COPY server ./server
COPY shared ./shared
COPY drizzle.config.ts ./

# Create directories for uploads and backups
RUN mkdir -p /app/uploads /app/backups

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "--loader", "tsx", "server/index.ts"]
