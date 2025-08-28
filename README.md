# Sentry-GitLab Issue 同步工具

## 功能說明

1. 自動同步 Sentry Issues 到 GitLab：
   - 每天固定時間（09:00、12:00、18:00）自動檢查
   - 從 Sentry 擷取新的 issues
   - 在 GitLab 建立對應的 issues
   - 自動加上標籤：'sentry' 和 'bug'

2. 智慧追蹤功能：
   - 避免重複建立相同的 issues
   - 追蹤 Sentry issues 的更新狀態
   - 當 Sentry issue 解決時，自動關閉對應的 GitLab issue
      1. 檢查 GitLab issue 是否存在
      2. 處理已關閉的 issue 狀態
      3. 自動清理不存在的 issue 記錄

      程式邏輯流程如下：
      1. 當發現 Sentry issue 已解決時：
        - 先檢查對應的 GitLab issue 是否存在
        - 如果存在且未關閉，則關閉它
        - 如果已關閉，則跳過
        - 如果不存在，則從追蹤記錄中移除
  
      2. 錯誤處理：
        - 404：表示 issue 不存在，自動清理記錄
        - 其他錯誤：顯示詳細錯誤訊息



## 系統需求

- Node.js 18 或以上版本
- 有效的 Sentry API 存取權杖
- GitLab 專案的存取權限

## 安裝步驟

1. 複製專案：
```bash
git clone [您的儲存庫 URL]
cd sentry-gitlab-poller
```

2. 安裝相依套件：
```bash
npm install
```

3. 設定環境變數：
   建立 `.env` 檔案並填入以下資訊：
```properties
SENTRY_AUTH_TOKEN=您的_SENTRY_TOKEN
SENTRY_ORG=您的_SENTRY_組織名稱
SENTRY_PROJECT=您的_SENTRY_專案名稱
GITLAB_API_TOKEN=您的_GITLAB_TOKEN
GITLAB_PROJECT_ID=您的_GITLAB_專案ID
GITLAB_API_URL=您的_GITLAB_API_URL
```

## 環境變數說明

- `SENTRY_AUTH_TOKEN`：Sentry API 授權金鑰
- `SENTRY_ORG`：Sentry 組織名稱
- `SENTRY_PROJECT`：Sentry 專案名稱
- `GITLAB_API_TOKEN`：GitLab 個人存取金鑰
- `GITLAB_PROJECT_ID`：GitLab 專案 ID
- `GITLAB_API_URL`：GitLab API 的基礎 URL
  - 公開 GitLab：`https://gitlab.com/api/v4`
  - 自架 GitLab：`http(s)://您的網域/api/v4`

## 使用方法

### 直接執行

```bash
node index.js
```

### 使用 Docker

1. 建立 Docker (強制重新建構 image)：
```bash
docker-compose build
```

2. 啟動服務 (使用剛建好的 image 啟動 container)：
```bash
docker-compose up -d
```

3. 查看記錄：
```bash
docker-compose logs -f
```

4. 停止服務：
```bash
docker-compose down
```

## 功能細節

### 自動同步處理
- 服務啟動時會立即執行一次初始檢查
- 在設定的排程時間（09:00、12:00、18:00）自動執行檢查
- 每次檢查會同時處理：
  1. 未解決的 issues：建立新的 GitLab issues
  2. 已解決的 issues：關閉對應的 GitLab issues

### GitLab Issue 格式
每個建立的 GitLab issue 包含：
- 標題前綴 "[Sentry]"
- Issue ID
- 發生時間（首次和最後）
- 錯誤訊息
- Sentry 連結
- 影響統計（事件數和使用者數）

## 注意事項

1. 確保環境變數正確設定
2. GitLab API Token 需要有建立和關閉 issue 的權限
3. 對於內部網路的 GitLab，程式已設定忽略 SSL 驗證
4. 建議使用 Docker 執行以確保環境一致性
5. 記錄檔會顯示所有同步操作的狀態

## 疑難排解

如果遇到問題，請檢查：
1. 環境變數是否正確設定
2. 網路連線狀態
3. API 權限是否足夠
4. Docker 記錄檔中的錯誤訊息

## 程式碼更新流程>Docker操作說明

1. 如果只修改了環境變數 (.env)：
```bash
# 重新啟動容器即可
docker-compose restart
```

2. 如果修改了程式碼 (*.js)：
```bash
# 停止並移除現有容器
docker-compose down

# 重新建構映像檔
docker-compose build

# 啟動新容器
docker-compose up -d
```

> 在 Docker Desktop 的圖形化介面（Docker Desktop GUI）裡沒辦法直接操作


### 常見更新情境

1. 環境變數更新
   - 修改 `.env` 檔案後只需重新啟動容器
   - 使用 `docker-compose restart`

2. 程式碼更新
   - 需要重新建構映像檔
   - 使用完整的 down-build-up 流程

3. 相依套件更新
   - 需要重新建構映像檔
   - 使用完整的 down-build-up 流程

### 注意事項

- 使用 `docker-compose down` 不會刪除已處理的記錄檔
- 重新建構映像檔會確保所有更改都被正確應用
- 建議定期查看記錄檔確認更新是否成功

