# Stage 1: Build client
FROM node:24-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Install server production dependencies
FROM node:24-slim AS server-deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Stage 3: Production
FROM node:24-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

WORKDIR /app/server
CMD ["dumb-init", "node", "--import", "tsx", "index.ts"]
