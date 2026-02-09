# ---- Stage 1: Install dependencies ----
FROM node:20-slim AS deps
WORKDIR /app

# Install OpenSSL for Prisma (required on slim images)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ---- Stage 2: Build the application ----
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---- Stage 3: Production image ----
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Sharp native binaries (included via standalone)
# Tesseract.js eng training data (for dev fallback OCR)
COPY --from=builder /app/node_modules/tesseract.js-core ./node_modules/tesseract.js-core

# Create uploads directory with correct permissions
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

# Run database migration then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
