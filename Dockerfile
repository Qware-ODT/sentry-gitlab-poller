FROM node:18-alpine

# 建立工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安裝相依套件
RUN npm install

# 複製其他專案檔案
COPY . .

# 設定時區為台北時間（因為排程是根據系統時間）
RUN apk add --no-cache tzdata
ENV TZ=Asia/Taipei

# 啟動應用程式
CMD ["node", "index.js"]
