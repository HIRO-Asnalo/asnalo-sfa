/**
 * 開封トラッキング API
 * GET /api/ma-track?id=xxx → 開封記録 + 1x1透明GIF返却
 */

const { updateRow, response } = require('./_db');

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

exports.handler = async (event) => {
  const id = event.queryStringParameters?.id;
  if (id) {
    updateRow('ma_sends', id, { opened_at: new Date().toISOString() }).catch(() => {});
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
    body: PIXEL.toString('base64'),
    isBase64Encoded: true,
  };
};
