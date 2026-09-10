FROM oven/bun:1-alpine

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application source
COPY tsconfig.json openapi.json ./
COPY src ./src

EXPOSE 3000

ENV PORT=3000

CMD ["bun", "run", "src/index.ts"]
