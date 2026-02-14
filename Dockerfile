# ========== 阶段1: 构建前端 ==========
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV VITE_API_URL=/api
RUN npx vite build

# ========== 阶段2: 构建后端 ==========
FROM node:20-slim AS backend-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
# 安装 openssl，Prisma 需要
RUN apt-get update && apt-get install -y openssl
RUN npm install
COPY server/ .
RUN npx prisma generate

# ========== 阶段3: 生产镜像 ==========
FROM node:20-slim AS production
WORKDIR /app

# 安装 nginx 和 openssl
RUN apt-get update && apt-get install -y nginx openssl && rm -rf /var/lib/apt/lists/*

# 复制前端构建产物
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# 复制后端
COPY --from=backend-build /app/server /app/server

# 复制nginx配置
RUN rm /etc/nginx/sites-enabled/default
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 复制启动脚本
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
