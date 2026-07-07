FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src ./src

EXPOSE 4000

CMD ["node", "src/server.js"]
