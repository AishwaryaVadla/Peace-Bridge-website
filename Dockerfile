FROM node:20-alpine AS frontend-builder

WORKDIR /client
COPY client/peace-bridge/package*.json ./
RUN npm install
COPY client/peace-bridge/ ./
RUN npm run build -- --base=/

FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/ ./
COPY --from=frontend-builder /client/dist ./public

EXPOSE 7860

ENV PORT=7860

CMD ["node", "index.js"]
