FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Accept build-time env vars
ARG VITE_API_BASE_URL
ARG VITE_APP_URL
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_COGNITO_DOMAIN

RUN npm run build

# ── Production stage: serve via nginx ──────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
