# ---- Build stage ----------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Build tools needed for better-sqlite3 native bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/data/data.db

# Copy production node_modules and built artefacts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Persistent volume for the SQLite database
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 5000
CMD ["node", "dist/index.cjs"]
