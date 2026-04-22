/**
 * 月次営業レポート自動投稿 GAS スクリプト
 * トリガー: 毎月1日 9:00（前月分を集計してSlack投稿）
 *
 * スクリプトプロパティ:
 *   SFA_URL         - Netlify サイトの URL（例: https://your-site.netlify.app）
 *   CRON_SECRET     - Netlify 環境変数 CRON_SECRET と同じ値
 */

function sendMonthlyReport() {
  const url    = PropertiesService.getScriptProperties().getProperty('SFA_URL');
  const secret = PropertiesService.getScriptProperties().getProperty('CRON_SECRET');

  if (!url || !secret) {
    console.error('SFA_URL または CRON_SECRET が設定されていません');
    return;
  }

  // 先月の年月を算出
  const now   = new Date();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();   // 1月なら12
  const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const endpoint = `${url}/api/monthly-report?year=${year}&month=${month}`;

  const res = UrlFetchApp.fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': secret,
    },
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    console.error(`月次レポートエラー: ${code} / ${res.getContentText()}`);
  } else {
    console.log('月次レポート送信完了:', res.getContentText());
  }
}
