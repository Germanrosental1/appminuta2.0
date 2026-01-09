# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY tsconfig*.json ./

# Copy Prisma schema
COPY prisma ./prisma

# Install dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV production

# Copy only production dependencies and Prisma schema
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production

# Generate Prisma Client in production stage
RUN npx prisma generate

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
