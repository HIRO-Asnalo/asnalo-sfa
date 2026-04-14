/**
 * フォローアップリマインダー GAS スクリプト
 * 毎朝、X日以上更新のない案件をSlackに通知する
 *
 * 【セットアップ手順】
 * 1. GAS新規プロジェクト作成 → このコードを貼り付け
 * 2. スクリプトプロパティに以下を設定:
 *    - SFA_API_URL  : https://asnalo-sfa.netlify.app/api/followup-reminder
 *    - CRON_SECRET  : Netlify環境変数 CRON_SECRET と同じ値
 *    - STALE_DAYS   : 何日未更新で通知するか（例: 7）
 * 3. トリガー設定: sendFollowupReminder → 時間主導型 → 毎日 → 午前9時〜10時
 */

function sendFollowupReminder() {
  const props    = PropertiesService.getScriptProperties();
  const apiUrl   = props.getProperty('SFA_API_URL');
  const secret   = props.getProperty('CRON_SECRET');
  const staleDays = parseInt(props.getProperty('STALE_DAYS') || '7');

  if (!apiUrl || !secret) {
    console.error('SFA_API_URL または CRON_SECRET が未設定です');
    return;
  }

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': secret,
    },
    payload: JSON.stringify({ stale_days: staleDays }),
    muteHttpExceptions: true,
  };

  try {
    const res  = UrlFetchApp.fetch(apiUrl, options);
    const code = res.getResponseCode();
    const body = JSON.parse(res.getContentText());

    if (code === 200) {
      console.log(`リマインダー完了: ${body.stale}件の未更新案件を通知`);
    } else {
      console.error(`リマインダーエラー [${code}]: ${JSON.stringify(body)}`);
    }
  } catch (e) {
    console.error('リマインダー例外:', e.message);
  }
}

/** 動作テスト用（手動実行） */
function testFollowupReminder() {
  sendFollowupReminder();
}
