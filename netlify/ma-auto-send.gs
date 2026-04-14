/**
 * MA自動配信 GAS スクリプト
 * 毎日指定時刻に未送信メールを一括配信する
 *
 * 【セットアップ手順】
 * 1. GAS新規プロジェクト作成 → このコードを貼り付け
 * 2. スクリプトプロパティに以下を設定:
 *    - MA_API_URL  : https://asnalo-sfa.netlify.app/api/ma-send
 *    - CRON_SECRET : Netlify環境変数 CRON_SECRET と同じ値
 * 3. トリガー設定: sendMAPending → 時間主導型 → 毎日 → 午前8時〜9時
 */

function sendMAPending() {
  const props  = PropertiesService.getScriptProperties();
  const apiUrl = props.getProperty('MA_API_URL');
  const secret = props.getProperty('CRON_SECRET');

  if (!apiUrl || !secret) {
    console.error('MA_API_URL または CRON_SECRET が未設定です');
    return;
  }

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': secret,
    },
    payload: JSON.stringify({}),
    muteHttpExceptions: true,
  };

  try {
    const res  = UrlFetchApp.fetch(apiUrl, options);
    const code = res.getResponseCode();
    const body = JSON.parse(res.getContentText());

    if (code === 200) {
      console.log(`MA自動配信完了: ${body.sent}件送信`);
      if (body.results && body.results.length > 0) {
        body.results.forEach(r => {
          console.log(`  → ${r.email}: ${r.status}`);
        });
      }
    } else {
      console.error(`MA配信エラー [${code}]: ${JSON.stringify(body)}`);
    }
  } catch (e) {
    console.error('MA配信例外:', e.message);
  }
}

/**
 * 動作テスト用（手動実行）
 */
function testSendMAPending() {
  sendMAPending();
}
