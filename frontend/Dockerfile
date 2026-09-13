# ----------------------------------------------------
# Production Dockerfile for Frontend (Vite React App)
# ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ----------------------------------------------------
# Production Web Server (Nginx)
# ----------------------------------------------------
FROM nginx:alpine AS runner

# Copy built static assets to nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx configuration for SPA routing & security headers
RUN echo 'server {' \
    '  listen 80;' \
    '  server_name localhost;' \
    '  root /usr/share/nginx/html;' \
    '  index index.html;' \
    '  location / {' \
    '    try_files $uri $uri/ /index.html;' \
    '  }' \
    '  location /assets/ {' \
    '    expires 1y;' \
    '    add_header Cache-Control "public, immutable";' \
    '  }' \
    '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
