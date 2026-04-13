/**
 * API クライアント
 * バックエンド Netlify Functions との通信
 */

const API = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const token = await Auth.getToken();
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error((data.error || `HTTP ${res.status}`) + (data.debug ? ` [${data.debug}]` : ''));
    return data;
  }

  // ===== Deals =====
  const deals = {
    list: ()       => request('GET',    '/deals'),
    get:  (id)     => request('GET',    `/deals?id=${id}`),
    create: (data) => request('POST',   '/deals', data),
    update: (data) => request('PUT',    '/deals', data),
    delete: (id)   => request('DELETE', `/deals?id=${id}`),
  };

  // ===== Customers =====
  const customers = {
    list: ()       => request('GET',    '/customers'),
    get:  (id)     => request('GET',    `/customers?id=${id}`),
    create: (data) => request('POST',   '/customers', data),
    update: (data) => request('PUT',    '/customers', data),
    delete: (id)   => request('DELETE', `/customers?id=${id}`),
  };

  // ===== Fields =====
  const fields = {
    list:   (entity = 'deal') => request('GET',    `/fields?entity=${entity}`),
    create: (data)            => request('POST',   '/fields', data),
    update: (data)            => request('PUT',    '/fields', data),
    delete: (id)              => request('DELETE', `/fields?id=${id}`),
  };

  // ===== Activities =====
  const activities = {
    listByDeal:     (deal_id)     => request('GET',    `/activities?deal_id=${deal_id}`),
    listByCustomer: (customer_id) => request('GET',    `/activities?customer_id=${customer_id}`),
    create: (data)                => request('POST',   '/activities', data),
    delete: (id)                  => request('DELETE', `/activities?id=${id}`),
  };

  // ===== Dashboard =====
  const dashboard = {
    stats: () => request('GET', '/dashboard'),
  };

  return { deals, customers, fields, activities, dashboard };
})();
