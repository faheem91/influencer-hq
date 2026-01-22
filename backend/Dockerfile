# Use Playwright's official Docker image with browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose the port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/instagram/test || exit 1

# Run the application
CMD ["npm", "start"]
