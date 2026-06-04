# Railway 若 Root Directory 留空，用此檔從 repo 根建置後端
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/index.js"]
