/**
 * ドキュメント/ファイル管理 API
 * GET    /api/documents                      → 一覧（?customer_id= or ?deal_id= フィルタ可）
 * GET    /api/documents?id=xxx               → 1件取得
 * GET    /api/documents?action=url&id=xxx    → ダウンロード署名URL取得
 * POST   /api/documents?action=presign       → アップロード署名URL取得 + DBレコード作成
 * PUT    /api/documents                      → メタデータ更新（名前・カテゴリ・メモ）
 * DELETE /api/documents?id=xxx              → Storage + DB 削除
 */
const { createClient } = require('@supabase/supabase-js');
const { getRows, getRow, insertRow, updateRow, deleteRow, response } = require('./_db');
const { requireAuth } = require('./_auth');

const BUCKET = 'documents';
const TABLE  = 'documents';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  const auth = requireAuth(event);
  if (auth.error) return auth;

  const params = event.queryStringParameters || {};
  const action = params.action;

  try {
    switch (event.httpMethod) {
      case 'GET': {
        // ダウンロード署名URL
        if (action === 'url') {
          const id = params.id;
          if (!id) return response(400, { error: 'id が必要です' });
          const doc = await getRow(TABLE, id);
          if (!doc) return response(404, { error: 'Not found' });
          const supabase = getSupabase();
          const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(doc.storage_path, 3600);
          if (error) return response(500, { error: error.message });
          return response(200, { url: data.signedUrl });
        }
        // 1件取得
        if (params.id) {
          const row = await getRow(TABLE, params.id);
          if (!row) return response(404, { error: 'Not found' });
          return response(200, row);
        }
        // 一覧取得（フィルタ付き）
        const supabase = getSupabase();
        let query = supabase.from(TABLE).select('*');
        if (params.customer_id) query = query.eq('customer_id', params.customer_id);
        if (params.deal_id)     query = query.eq('deal_id', params.deal_id);
        query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return response(200, data || []);
      }

      case 'POST': {
        // アップロード署名URL発行 + DBレコード作成
        if (action === 'presign') {
          const body = JSON.parse(event.body || '{}');
          if (!body.name || !body.file_type) {
            return response(400, { error: 'name と file_type は必須です' });
          }
          const ext = body.name.split('.').pop() || 'bin';
          const ts  = Date.now();
          const path = `${ts}_${Math.random().toString(36).slice(2,8)}.${ext}`;

          const supabase = getSupabase();
          const { data: su, error: se } = await supabase.storage
            .from(BUCKET)
            .createSignedUploadUrl(path);
          if (se) return response(500, { error: se.message });

          // DBにレコード挿入（アップロード前に作成）
          const rec = await insertRow(TABLE, {
            name:         body.name,
            category:     body.category || 'その他',
            file_type:    body.file_type,
            file_size:    body.file_size || 0,
            storage_path: path,
            customer_id:  body.customer_id || null,
            deal_id:      body.deal_id     || null,
            uploaded_by:  auth.user?.email || '',
            memo:         body.memo || '',
          });

          return response(200, {
            id:         rec.id,
            signed_url: su.signedUrl,
            path,
          });
        }
        return response(400, { error: '不明なアクションです' });
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        if (!body.id) return response(400, { error: 'id が必要です' });
        await updateRow(TABLE, body.id, {
          ...(body.name     !== undefined && { name:     body.name }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.memo     !== undefined && { memo:     body.memo }),
        });
        return response(200, { success: true });
      }

      case 'DELETE': {
        const id = params.id;
        if (!id) return response(400, { error: 'id が必要です' });
        const doc = await getRow(TABLE, id);
        if (!doc) return response(404, { error: 'Not found' });

        // Storageから削除
        const supabase = getSupabase();
        await supabase.storage.from(BUCKET).remove([doc.storage_path]);

        // DBから削除
        await deleteRow(TABLE, id);
        return response(200, { success: true });
      }

      default: return response(405, { error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('documents error:', err);
    return response(500, { error: err.message });
  }
};
