require('dotenv').config();
const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');

class SentryGitLabPoller {
  constructor() {
    this.processedIssuesFile = path.join(__dirname, 'processed-issues.json');
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

    // 載入已處理的 issues
    this.loadProcessedIssues();
  }

  loadProcessedIssues() {
    try {
      if (fs.existsSync(this.processedIssuesFile)) {
        const data = fs.readFileSync(this.processedIssuesFile, 'utf8');
        this.processedIssues = JSON.parse(data).processedIssues || {};
      } else {
        this.processedIssues = {};
      }
    } catch (error) {
      console.error('載入已處理 issues 時發生錯誤:', error);
      this.processedIssues = {};
    }
  }

  saveProcessedIssues() {
    try {
      fs.writeFileSync(
        this.processedIssuesFile,
        JSON.stringify({ processedIssues: this.processedIssues }, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('儲存已處理 issues 時發生錯誤:', error);
    }
  }

  isIssueProcessed(sentryIssue) {
    const processedIssue = this.processedIssues[sentryIssue.id];
    if (!processedIssue) return false;

    // 如果 issue 的最後更新時間比我們記錄的更新時間新，就重新處理
    return new Date(sentryIssue.lastSeen) <= new Date(processedIssue.lastSeen);
  }

  updateProcessedIssue(sentryIssue, gitlabIssueId) {
    this.processedIssues[sentryIssue.id] = {
      gitlabIssueId,
      lastSeen: sentryIssue.lastSeen,
      lastProcessed: new Date().toISOString()
    };
    this.saveProcessedIssues();
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
    // 檢查是否已經處理過此 issue
    if (this.isIssueProcessed(sentryIssue)) {
      console.log(`Issue ${sentryIssue.id} 已經處理過且沒有更新，跳過`);
      return;
    }

    const issueData = {
      title: `[Sentry] ${sentryIssue.title}`,
      description: this.formatGitLabDescription(sentryIssue),
      labels: ['sentry', 'bug'],
    };

    try {
      console.log('正在嘗試建立 GitLab issue...');
      console.log('GitLab API URL:', `${process.env.GITLAB_API_URL}/projects/${process.env.GITLAB_PROJECT_ID}/issues`);
      
      const response = await this.gitlabClient.post(`/projects/${process.env.GITLAB_PROJECT_ID}/issues`, issueData);
      console.log(`已建立 GitLab issue: ${issueData.title}`);
      
      // 記錄已處理的 issue
      this.updateProcessedIssue(sentryIssue, response.data.id);
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
      console.log(`從 Sentry 擷取到 ${issues.length} 個 issues`);
      
      for (const issue of issues) {
        await this.createGitLabIssue(issue);
      }
    } catch (error) {
      console.error('輪詢過程中發生錯誤:', error.message);
    }
  }

  start() {
    const now = new Date();
    console.log('服務已啟動');
    console.log('排程設定：');
    console.log('- 09:00 每日檢查');
    console.log('- 12:00 每日檢查');
    console.log('- 18:00 每日檢查');
    
    // 設定排程時間
    const schedules = [
      { time: '0 9 * * *', desc: '09:00' },
      { time: '0 12 * * *', desc: '12:00' },
      { time: '0 18 * * *', desc: '18:00' }
    ];
    
    schedules.forEach(({ time, desc }) => {
      const job = schedule.scheduleJob(time, () => {
        const execTime = new Date();
        console.log(`\n[${execTime.toLocaleString()}] 執行 ${desc} 的排程檢查`);
        this.poll();
      });

      if (job) {
        const nextRun = job.nextInvocation();
        console.log(`下次 ${desc} 執行時間: ${nextRun.toLocaleString()}`);
      } else {
        console.error(`警告: ${desc} 的排程設定失敗`);
      }
    });

    console.log('\n正在執行初始檢查...');
    this.poll();
  }
}

// 啟動服務
const poller = new SentryGitLabPoller();
poller.start();
