# Use the Bun image
FROM oven/bun:latest

# Install Nginx, OpenSSL, and Redis
RUN apt-get update && apt-get install -y unzip 

# Ensure we have the latest version of Bun
RUN bun upgrade

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN bun install

# Copy the rest of the backend application
COPY . .

# Build the TypeScript project
RUN bun run build 

EXPOSE 4000 6379

# Start Redis and the Bun app
CMD bun run start