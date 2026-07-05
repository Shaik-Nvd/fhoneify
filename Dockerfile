FROM mcr.microsoft.com/playwright:v1.45.0-jammy

# Set Node environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose production port
EXPOSE 10000

# Start command runs the API server
CMD ["npm", "run", "start:api"]
