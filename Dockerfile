# CloudNextra WhatsApp Bot V2.0 - Docker Configuration
# Multi-stage build for optimized image size and better caching
FROM node:20-slim as builder

# Set build-time environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies with optimized flags
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Production stage
FROM node:20-slim

# Metadata for V2.0
LABEL version="2.0.0"
LABEL description="CloudNextra WhatsApp Bot V2.0 - Professional Multi-Device Bot"
LABEL maintainer="CloudNextra"
LABEL org.opencontainers.image.source="https://github.com/GihanPasidu/WA-BOT"

# Set production environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps"
ENV TZ=UTC

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    imagemagick \
    webp \
    curl \
    ca-certificates \
    && apt-get upgrade -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y

# Create non-root user for security
RUN groupadd -r cloudnextra && useradd -r -g cloudnextra cloudnextra

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=cloudnextra:cloudnextra . .

# Create and set permissions for auth directory
RUN mkdir -p auth_info logs tmp && \
    chown -R cloudnextra:cloudnextra /app && \
    chmod -R 755 /app

# Switch to non-root user
USER cloudnextra

# Expose port with documentation
EXPOSE $PORT
EXPOSE 10000

# Add comprehensive health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/health || exit 1

# Volume for persistent data
VOLUME ["/app/auth_info", "/app/logs"]

# Start the application with proper signal handling
CMD ["node", "index.js"]

# Build information
ARG BUILD_DATE
ARG VCS_REF
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.version="2.0.0"
