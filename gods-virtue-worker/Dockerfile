FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose healthcheck/webhook port if needed
EXPOSE 3000

# Run worker process
CMD ["node", "index.js"]
