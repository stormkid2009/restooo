# Dockerfile

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build tools)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (ci is faster and more reliable for lockfiles)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Remove development dependencies to keep the image small
# Note: We need to keep @prisma/client which is a production dependency
RUN npm prune --production

# Stage 2: Create the production image
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files from the builder stage
COPY --from=builder /app/package*.json ./
# Copy node_modules with only production dependencies and generated Prisma client
COPY --from=builder /app/node_modules ./node_modules
# Copy the built application
COPY --from=builder /app/dist ./dist
# Copy prisma directory if needed for migrations at runtime (optional but good practice)
COPY --from=builder /app/prisma ./prisma

# Expose the application port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Use a non-root user for security
USER node

# Start the application using the built files
CMD ["node", "dist/server.js"]
