/**
 * タスクリマインダー GAS
 * 毎日 9:00 に実行
 * 当日期限・期限超過のタスクを Slack に通知する
 *
 * スクリプトプロパティ:
 *   SFA_BASE_URL   : Netlify のベース URL（例: https://asnalo-sfa.netlify.app）
 *   CRON_SECRET    : Netlify の CRON_SECRET
 *   SLACK_WEBHOOK  : Slack Incoming Webhook URL
 */

function sendTaskReminder() {
  const BASE_URL    = PropertiesService.getScriptProperties().getProperty('SFA_BASE_URL');
  const CRON_SECRET = PropertiesService.getScriptProperties().getProperty('CRON_SECRET');
  const WEBHOOK     = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK');

  if (!BASE_URL || !CRON_SECRET || !WEBHOOK) {
    console.error('スクリプトプロパティが未設定です');
    return;
  }

  // タスク一覧を取得（未完了のみ）
  const res = UrlFetchApp.fetch(`${BASE_URL}/api/activities?tasks=true`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    console.error('タスク取得エラー:', res.getContentText());
    return;
  }

  const tasks = JSON.parse(res.getContentText());
  const today = new Date().toISOString().slice(0, 10);

  const overdue = tasks.filter(t => t.due_date && t.due_date < today);
  const dueToday = tasks.filter(t => t.due_date === today);

  if (overdue.length === 0 && dueToday.length === 0) return;

  const blocks = [];

  if (dueToday.length > 0) {
    blocks.push({ type: 'header', text: { type: 'plain_text', text: '📋 本日期限のタスク' } });
    dueToday.forEach(t => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${t.content}*\n担当: ${t.assigned_to || '未設定'}`,
        },
        accessory: t.deal_id ? {
          type: 'button',
          text: { type: 'plain_text', text: '案件を開く' },
          url: `${BASE_URL}/deals/detail.html?id=${t.deal_id}`,
        } : undefined,
      });
    });
  }

  if (overdue.length > 0) {
    blocks.push({ type: 'header', text: { type: 'plain_text', text: `⚠️ 期限超過タスク（${overdue.length}件）` } });
    overdue.slice(0, 5).forEach(t => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${t.content}*\n期日: ${t.due_date} ／ 担当: ${t.assigned_to || '未設定'}`,
        },
        accessory: t.deal_id ? {
          type: 'button',
          text: { type: 'plain_text', text: '案件を開く' },
          url: `${BASE_URL}/deals/detail.html?id=${t.deal_id}`,
        } : undefined,
      });
    });
    if (overdue.length > 5) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `他 ${overdue.length - 5} 件は SFA で確認してください。` } });
    }
  }

  UrlFetchApp.fetch(WEBHOOK, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ blocks }),
    muteHttpExceptions: true,
  });

  console.log(`通知完了: 今日期限${dueToday.length}件, 超過${overdue.length}件`);
}
