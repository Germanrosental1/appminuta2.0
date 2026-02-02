# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY tsconfig*.json ./

# Copy Prisma schemas (main and UIF)
COPY prisma ./prisma
COPY prisma-uif ./prisma-uif

# Install dependencies and generate both Prisma Clients
RUN npm ci && npm cache clean --force && \
    npx prisma generate && \
    npx prisma generate --schema=prisma-uif/schema.prisma

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

# Install tini for proper signal handling and required libraries
RUN apk add --no-cache openssl libc6-compat tini

WORKDIR /app

ENV NODE_ENV=production

# Add labels for better maintainability
LABEL org.opencontainers.image.source="https://github.com/Germanrosental1/appminuta"
LABEL org.opencontainers.image.description="AppMinuta Backend API"

# Copy only production dependencies and Prisma schemas
COPY package*.json ./
COPY prisma ./prisma
COPY prisma-uif ./prisma-uif
# Install dependencies and generate both Prisma Clients
RUN npm ci --only=production && npm cache clean --force && \
    npx prisma generate && \
    npx prisma generate --schema=prisma-uif/schema.prisma

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Use non-root user for security
USER node

EXPOSE 3000

# Healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# ⚡ M-004: Node.js memory optimization flags
# --max-old-space-size=600: Limita el heap a 600MB (dejando ~168MB para stack/buffers)
# Previene OOM kills cuando V8 intenta usar más memoria que el límite del container
CMD ["node", "--max-old-space-size=600", "dist/src/main.js"]
