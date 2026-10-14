# Use official Node LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Add non‑root user for security
RUN addgroup -S app && adduser -S -G app app
USER app

# Expose (optional) any ports – none needed for a background worker
# EXPOSE 3000

# Start the worker
CMD ["node", "index.js"]
