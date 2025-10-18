# Contracts Dockerfile
# Hardhat node for local blockchain testing

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init git curl
ENV NODE_ENV=development

FROM base AS dependencies
COPY package*.json ./
RUN npm ci

FROM base AS runtime
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run compile

EXPOSE 8545

CMD ["dumb-init", "npx", "hardhat", "node"]