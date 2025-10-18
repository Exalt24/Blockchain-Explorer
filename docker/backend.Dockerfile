# Backend Dockerfile
# Multi-stage build for optimized production image

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

FROM base AS development
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["dumb-init", "npm", "run", "dev"]

FROM base AS production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 4000
USER node
CMD ["dumb-init", "node", "dist/index.js"]