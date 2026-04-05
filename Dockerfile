FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
ENV NGINX_PORT=80
ENV API_UPSTREAM=http://localhost:5000

COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD sh -c "wget -q -O /dev/null http://localhost:${NGINX_PORT:-80}/healthz || exit 1"

CMD ["nginx", "-g", "daemon off;"]
