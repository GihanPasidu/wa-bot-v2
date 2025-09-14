FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    curl \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove lock file and install fresh (for first-time setup)
RUN rm -f package-lock.json && \
    npm install --omit=dev && \
    npm shrinkwrap && \
    mv npm-shrinkwrap.json package-lock.json

# Copy application code
COPY . .

# Create directory for auth data
RUN mkdir -p auth_info

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["npm", "start"]
