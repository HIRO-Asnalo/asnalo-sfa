/**
 * MA配信処理 API
 * POST /api/ma-send → 今日送るべきメールを全て配信
 * POST /api/ma-send { enroll: true, sequence_id, customer_id } → 顧客をシナリオに登録
 */

const https = require('https');
const { getRows, getRow, insertRow, updateRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

function sendEmail({ to, from, subject, body, trackingId }) {
  return new Promise((resolve, reject) => {
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        ${body.replace(/\n/g, '<br>')}
        ${trackingId ? `<img src="https://asnalo-sfa.netlify.app/api/ma-track?id=${trackingId}" width="1" height="1" style="display:none;">` : ''}
      </div>`;

    const payload = JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    });

    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});

  // CRON_SECRET による自動配信バイパス（GASからの定期実行用）
  const cronSecret = process.env.CRON_SECRET;
  const cronHeader = event.headers?.['x-cron-secret'];
  const isCron = cronSecret && cronHeader === cronSecret;

  if (!isCron) {
    const auth = requireAuth(event);
    if (auth.error) return auth;
  }

  if (event.httpMethod !== 'POST') return response(405, { error: 'Method Not Allowed' });

  const body = JSON.parse(event.body || '{}');

  try {
    // ===== 顧客をシナリオに登録 =====
    if (body.enroll) {
      const { sequence_id, customer_id } = body;
      if (!sequence_id || !customer_id) return response(400, { error: 'sequence_id と customer_id が必要です' });

      const seq = await getRow('ma_sequences', sequence_id);
      const steps = await getRows('ma_steps', { sequence_id });
      steps.sort((a, b) => a.step_order - b.step_order);

      const customer = await getRow('customers', customer_id);
      const enrolledAt = new Date();

      // 各ステップの送信予定を作成
      const sends = [];
      for (const step of steps) {
        const scheduledAt = new Date(enrolledAt);
        scheduledAt.setDate(scheduledAt.getDate() + step.delay_days);
        const send = await insertRow('ma_sends', {
          sequence_id,
          step_id: step.id,
          customer_id,
          email: customer.contact_email || '',
          status: '未送信',
          scheduled_at: scheduledAt.toISOString(),
        });
        sends.push(send);
      }

      // enrollments に記録
      await insertRow('ma_enrollments', {
        sequence_id,
        customer_id,
        status: 'active',
      }).catch(() => {}); // 重複時は無視

      return response(200, { enrolled: true, sends });
    }

    // ===== 今日送るべきメールを配信 =====
    const now = new Date();
    const pending = await getRows('ma_sends', { status: '未送信' });
    const toSend = pending.filter(s => s.scheduled_at && new Date(s.scheduled_at) <= now && s.email);

    const results = [];
    for (const send of toSend) {
      const step = await getRow('ma_steps', send.step_id).catch(() => null);
      if (!step) continue;

      const res = await sendEmail({
        to: send.email,
        from: 'アスナロ <noreply@asnalo.com>',
        subject: step.subject,
        body: step.body,
        trackingId: send.id,
      });

      const status = res.status === 200 || res.status === 201 ? '送信済み' : 'エラー';
      await updateRow('ma_sends', send.id, {
        status,
        sent_at: status === '送信済み' ? now.toISOString() : null,
      });
      results.push({ id: send.id, email: send.email, status });
    }

    return response(200, { sent: results.length, results });
  } catch (err) {
    console.error('ma-send error:', err);
    return response(500, { error: err.message });
  }
};
