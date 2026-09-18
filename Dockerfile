FROM mcr.microsoft.com/playwright:v1.61.1-jammy

# Set Node environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# The Prisma schema must be present BEFORE npm install: postinstall now runs
# `prisma generate`, which exits non-zero with "prisma/schema: directory not
# found" if the schema has not been copied yet - failing the whole image build.
# That is what broke the Render deploy of 5b30136.
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Install Playwright browser binaries
RUN npx playwright install chromium

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose production port
EXPOSE 10000

# Start command runs the API server
CMD ["npm", "run", "start:api"]
