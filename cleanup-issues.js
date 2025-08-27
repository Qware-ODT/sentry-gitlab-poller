require('dotenv').config();
const axios = require('axios');

class GitLabIssueCleaner {
  constructor() {
    this.gitlabClient = axios.create({
      baseURL: process.env.GITLAB_API_URL,
      headers: {
        'PRIVATE-TOKEN': process.env.GITLAB_API_TOKEN
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });
  }

  async deleteGitLabIssue(gitlabIssueId) {
    try {
      // 使用 PUT 請求來關閉 issue
      await this.gitlabClient.put(`/projects/${process.env.GITLAB_PROJECT_ID}/issues/${gitlabIssueId}`, {
        state_event: 'close'
      });
      console.log(`已關閉 GitLab issue: ${gitlabIssueId}`);
      return true;
    } catch (error) {
      if (error.response) {
        console.error(`關閉 GitLab issue ${gitlabIssueId} 時發生錯誤:`, {
          狀態碼: error.response.status,
          訊息: error.response.data.message || error.message,
          URL: error.response.config.url
        });
      } else {
        console.error(`關閉 GitLab issue ${gitlabIssueId} 時發生錯誤:`, error.message);
      }
      return false;
    }
  }

  async deleteSpecificIssues(issueIds) {
    console.log('開始關閉指定的 GitLab issues...');
    let closedCount = 0;

    try {
      // 處理每個 ID 或 ID 範圍
      for (const id of issueIds) {
        if (id.includes('-')) {
          // 處理 ID 範圍
          const [start, end] = id.split('-').map(Number);
          for (let i = start; i <= end; i++) {
            const closed = await this.deleteGitLabIssue(i);
            if (closed) closedCount++;
          }
        } else {
          // 處理單個 ID
          const closed = await this.deleteGitLabIssue(parseInt(id));
          if (closed) closedCount++;
        }
      }

      console.log(`操作完成，成功關閉 ${closedCount} 個 issues`);
    } catch (error) {
      console.error('刪除 issues 時發生錯誤:', error.message);
    }
  }
}

// 取得命令列參數
const args = process.argv.slice(2);
const cleaner = new GitLabIssueCleaner();

if (args.length === 0) {
  console.log('使用方式：');
  console.log('1. 刪除指定 ID: node cleanup-issues.js --ids 123,456,789');
  console.log('2. 刪除 ID 範圍: node cleanup-issues.js --ids 44-240');
  console.log('3. 混合使用: node cleanup-issues.js --ids 44-240,300,350-400');
  process.exit(1);
}

// 處理參數
switch (args[0]) {
  case '--ids':
    const ids = args[1] ? args[1].split(',') : [];
    if (ids.length === 0) {
      console.log('請提供要刪除的 issue IDs');
      console.log('例如:');
      console.log('- 單個 ID: --ids 123,456,789');
      console.log('- ID 範圍: --ids 44-240');
      console.log('- 混合使用: --ids 44-240,300,350-400');
      process.exit(1);
    }
    cleaner.deleteSpecificIssues(ids);
    break;

  default:
    console.log('無效的參數。使用方式：');
    console.log('1. 按天數刪除: node cleanup-issues.js --days 30');
    console.log('2. 刪除指定 ID: node cleanup-issues.js --ids 123,456,789');
    process.exit(1);
}
