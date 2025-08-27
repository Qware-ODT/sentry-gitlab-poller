# Sentry-GitLab Issue 同步工具

這是一個自動化工具，用於將 Sentry 的錯誤議題（Issues）同步到 GitLab 的議題追蹤系統。

## 主要功能

### 1. 自動同步 Sentry Issues
透過 `index.js` 實現的功能：

- 自動從 Sentry 擷取新的錯誤議題
- 自動在 GitLab 建立對應的議題
- 包含詳細的錯誤資訊和 Sentry 連結
- 固定排程執行（預設為每天 09:00、12:00、18:00）
- 避免重複建立相同的議題

## 必要條件

- Node.js 版本 >= 14
- Sentry 專案的存取權限
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

### 使用 Docker（推薦）

1. 建立 Docker 映像檔：
```bash
docker-compose build
```

2. 啟動服務：
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

服務啟動後會：
1. 立即執行一次初始檢查
2. 在設定的排程時間（09:00、12:00、18:00）自動執行檢查

## 輸出的 GitLab 議題格式

每個自動建立的 GitLab 議題將包含：
- 標題：`[Sentry] 原始錯誤標題`
- 標籤：`sentry`, `bug`
- 詳細資訊：
  - Issue ID
  - 發生時間（首次和最後）
  - 錯誤訊息
  - Sentry 連結
  - 影響統計（事件數和使用者數）

## 議題管理工具

專案包含一個額外的議題管理工具 `cleanup-issues.js`，用於批次關閉 GitLab issues。

### 使用方式

1. 關閉單個或多個特定 ID 的議題：
```bash
node cleanup-issues.js --ids 123,456,789
```

2. 關閉一個範圍內的議題：
```bash
node cleanup-issues.js --ids 44-240
```

3. 混合使用（同時指定範圍和單個 ID）：
```bash
node cleanup-issues.js --ids 44-240,300,350-400
```

### 功能說明
- 支援單個 ID、多個 ID 和 ID 範圍的組合
- 自動處理錯誤並繼續執行其他 ID
- 顯示詳細的執行進度和結果
- 支援內部 GitLab（含自簽憑證）

### 執行結果
- 會顯示每個被關閉的議題 ID
- 最後會顯示成功關閉的總數
- 如果發生錯誤會顯示詳細的錯誤資訊

## 注意事項

1. 如果使用自架的 GitLab，請確保：
   - 設定正確的 GitLab API URL
   - 如果使用自簽憑證，程式已設定忽略 SSL 驗證
2. 確保 GitLab Token 具有：
   - 建立議題的權限（用於 index.js）
   - 關閉議題的權限（用於 cleanup-issues.js）
3. Sentry Token 需要具有讀取議題的權限
