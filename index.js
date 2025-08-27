require('dotenv').config();
const axios = require('axios');
const schedule = require('node-schedule');

class SentryGitLabPoller {
  constructor() {
    this.sentryClient = axios.create({
      baseURL: 'https://sentry.io/api/0/',
      headers: {
        'Authorization': `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    this.gitlabClient = axios.create({
      baseURL: process.env.GITLAB_API_URL,
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_API_TOKEN
      },
      // 針對內部網路 GitLab 的設定
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false // 允許自簽憑證
      })
    });

    // 用於儲存已處理的 Sentry issue
    this.processedIssues = new Set();
  }

  async fetchSentryIssues() {
    try {
      console.log('正在嘗試從 Sentry 擷取資料...');
      const endpoint = `projects/${process.env.SENTRY_ORG}/${process.env.SENTRY_PROJECT}/issues/`;
      console.log('使用的 Sentry API 端點:', endpoint);
      const response = await this.sentryClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('從 Sentry 擷取 issue 時發生錯誤:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        headers: error.config?.headers
      });
      if (error.response?.data) {
        console.error('錯誤詳細資訊:', error.response.data);
      }
      return [];
    }
  }

  async createGitLabIssue(sentryIssue) {
    const issueData = {
      title: `[Sentry] ${sentryIssue.title}`,
      description: this.formatGitLabDescription(sentryIssue),
      labels: ['sentry', 'bug'],
    };

    try {
      console.log('正在嘗試建立 GitLab issue...');
      console.log('GitLab API URL:', `${process.env.GITLAB_API_URL}/projects/${process.env.GITLAB_PROJECT_ID}/issues`);
      
      await this.gitlabClient.post(`/projects/${process.env.GITLAB_PROJECT_ID}/issues`, issueData);
      console.log(`已建立 GitLab issue: ${issueData.title}`);
    } catch (error) {
      console.error('建立 GitLab issue 時發生錯誤:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      if (error.response?.data) {
        console.error('GitLab 錯誤詳細資訊:', error.response.data);
      }
    }
  }

  formatGitLabDescription(sentryIssue) {
    return `
## Sentry Issue 詳細資訊
- **Issue ID:** ${sentryIssue.id}
- **首次發生:** ${new Date(sentryIssue.firstSeen).toLocaleString()}
- **最後發生:** ${new Date(sentryIssue.lastSeen).toLocaleString()}

## 錯誤訊息
\`\`\`
${sentryIssue.title}
\`\`\`

## Sentry 連結
[在 Sentry 中檢視此 Issue](${sentryIssue.permalink})

## 事件統計
- 總計事件數: ${sentryIssue.count}
- 影響使用者數: ${sentryIssue.userCount}
`;
  }

  async poll() {
    console.log('開始輪詢 Sentry issues...');
    
    try {
      const issues = await this.fetchSentryIssues();
      
      for (const issue of issues) {
        if (!this.processedIssues.has(issue.id)) {
          await this.createGitLabIssue(issue);
          this.processedIssues.add(issue.id);
        }
      }
    } catch (error) {
      console.error('輪詢過程中發生錯誤:', error.message);
    }
  }

  start() {
    console.log('服務已啟動，將在每天 09:00、12:00、18:00 執行檢查');
    
    // 設定排程時間
    const schedules = ['0 9 * * *', '0 12 * * *', '0 18 * * *'];
    
    schedules.forEach(cronTime => {
      schedule.scheduleJob(cronTime, () => {
        console.log(`開始執行排程檢查 - ${new Date().toLocaleString()}`);
        this.poll();
      });
    });

    // 立即執行一次初始檢查
    this.poll();
  }
}

// 啟動服務
const poller = new SentryGitLabPoller();
poller.start();
