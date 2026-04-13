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

module.exports = { notifyDealCreated, notifyPhaseChanged };
