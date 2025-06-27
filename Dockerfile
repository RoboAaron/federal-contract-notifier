# Stage 1: Build frontend
FROM node:20 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20 AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 3: Production image
FROM node:20-slim
WORKDIR /app
COPY --from=backend-build /app .
COPY --from=frontend-build /app/frontend/build ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"] 