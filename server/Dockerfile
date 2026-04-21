FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npx prisma generate
RUN npx tsc --outDir dist-seed --module commonjs --target es2019 --esModuleInterop true \
    --resolveJsonModule true --skipLibCheck true prisma/seed.ts 2>/dev/null || true

FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl openssl python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed

EXPOSE 5100

CMD sh -c "npx prisma migrate deploy && node dist/src/main.js"
