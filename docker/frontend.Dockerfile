# Frontend Dockerfile
# Multi-stage build for development and production

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init curl
ENV NODE_ENV=development

FROM base AS dependencies
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:alpine AS production
RUN apk add --no-cache curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM base AS development
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev", "--", "--host", "0.0.0.0"]