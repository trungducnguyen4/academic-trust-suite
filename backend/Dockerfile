# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
COPY prisma ./prisma

RUN cd backend && npm ci

COPY backend/tsconfig.json backend/nest-cli.json ./backend/
COPY backend/src ./backend/src

RUN cd backend && npm run prisma:generate
RUN cd backend && npm run build
RUN cd backend && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/prisma /app/prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]
