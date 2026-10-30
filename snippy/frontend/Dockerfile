# Step 1 build the angular application using production config
FROM node:22 AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

RUN npm install -g @angular/cli

COPY . .

RUN npm run build -- --configuration=production

# Step 2 Use nginx to serve the application (non-root, listen 8080)
FROM nginx:1.27-alpine

RUN apk add --no-cache curl

COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./nginx.site.conf /etc/nginx/conf.d/default.conf
COPY ./nginx-security-headers.inc /etc/nginx/nginx-security-headers.inc
COPY ./nginx-csp.inc /etc/nginx/nginx-csp.inc
COPY ./nginx-app-headers.inc /etc/nginx/nginx-app-headers.inc
COPY ./nginx-embed-headers.inc /etc/nginx/nginx-embed-headers.inc
COPY ./nginx-preview-headers.inc /etc/nginx/nginx-preview-headers.inc

COPY --from=build /app/dist/snippy-frontend/browser /usr/share/nginx/html

COPY entrypoint.sh /entrypoint.sh

RUN mkdir -p /tmp/nginx /var/cache/nginx \
    && chmod +x /entrypoint.sh \
    && chown -R nginx:nginx \
        /usr/share/nginx/html \
        /etc/nginx \
        /var/cache/nginx \
        /var/log/nginx \
        /tmp/nginx \
        /entrypoint.sh

USER nginx

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
