/**
 * Slack 通知ヘルパー
 */

const https = require('https');

function postToSlack(payload) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) { console.error('[slack] SLACK_WEBHOOK_URL not set'); return Promise.resolve(); }

  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        if (res.statusCode !== 200) console.error('[slack] error:', res.statusCode, data);
        resolve();
      });
    });
    req.on('error', (e) => { console.error('[slack] request error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

function phaseEmoji(phase) {
  const map = {
    '認知商談': '🔵', 'ヒアリング': '👂', '提案': '📄',
    'クロージング': '🤝', '受注': '🎉', '失注': '😞',
  };
  return map[phase] || '📌';
}

/** 新規案件作成通知 */
function notifyDealCreated(deal, userName) {
  return postToSlack({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🆕 新規案件が登録されました', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*案件名*\n${deal.deal_name || '（無題）'}` },
          { type: 'mrkdwn', text: `*企業名*\n${deal.company_name || '—'}` },
          { type: 'mrkdwn', text: `*フェーズ*\n${phaseEmoji(deal.phase)} ${deal.phase || '—'}` },
          { type: 'mrkdwn', text: `*担当者*\n${userName || deal.assigned_user || '—'}` },
        ],
      },
    ],
  });
}

/** フェーズ変更通知 */
function notifyPhaseChanged(deal, oldPhase, userName) {
  const isWon  = deal.phase === '受注';
  const isLost = deal.phase === '失注';
  const header = isWon  ? '🎉 受注確定！おめでとうございます！'
               : isLost ? '😞 失注となりました'
               : `${phaseEmoji(deal.phase)} フェーズが変更されました`;

  return postToSlack({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: header, emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*案件名*\n${deal.deal_name || '（無題）'}` },
          { type: 'mrkdwn', text: `*企業名*\n${deal.company_name || '—'}` },
          { type: 'mrkdwn', text: `*変更*\n${phaseEmoji(oldPhase)} ${oldPhase} → ${phaseEmoji(deal.phase)} ${deal.phase}` },
          { type: 'mrkdwn', text: `*担当者*\n${userName || deal.assigned_user || '—'}` },
        ],
      },
    ],
  });
}

/** フォローアップリマインダー通知 */
function notifyStaleDeals(deals, staleDays) {
  if (!deals.length) return Promise.resolve();

  const rows = deals.map(d =>
    `• *${d.deal_name || '（無題）'}* ／ ${d.company_name || '—'} ／ ${phaseEmoji(d.phase)} ${d.phase} ／ 担当: ${d.assigned_user || '—'} ／ *${d.staleDays}日間未更新*`
  ).join('\n');

  return postToSlack({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `⚠️ ${staleDays}日以上更新されていない案件 (${deals.length}件)`, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: rows } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '対応が必要な案件を確認してください。' }] },
    ],
  });
}

/** 月次営業レポート通知 */
function notifyMonthlyReport(stats, year, month) {
  const won   = stats.won_count  || 0;
  const lost  = stats.lost_count || 0;
  const total = won + lost;
  const wr    = total ? Math.round(won / total * 100) : 0;
  const fmtAmt = (v) => v ? `¥${Number(v).toLocaleString()}` : '—';

  return postToSlack({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `📊 ${year}年${month}月 営業月次レポート`, emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*受注件数*\n${won}件` },
          { type: 'mrkdwn', text: `*受注金額*\n${fmtAmt(stats.revenue)}` },
          { type: 'mrkdwn', text: `*失注件数*\n${lost}件` },
          { type: 'mrkdwn', text: `*受注率*\n${wr}%` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*新規案件数*\n${stats.new_deals || 0}件` },
          { type: 'mrkdwn', text: `*パイプライン総額*\n${fmtAmt(stats.pipeline)}` },
          { type: 'mrkdwn', text: `*活動数*\n${stats.activities || 0}件` },
          { type: 'mrkdwn', text: `*MAメール送信数*\n${stats.ma_sent || 0}件` },
        ],
      },
      { type: 'divider' },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `自動生成レポート · ${year}年${month}月末時点` }] },
    ],
  });
}

module.exports = { notifyDealCreated, notifyPhaseChanged, notifyStaleDeals, notifyMonthlyReport };
