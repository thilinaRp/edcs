# Use Node.js LTS as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend assets
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "dev"]
