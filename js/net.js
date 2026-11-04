// Onlayn server bilan aloqa: HTTP API va qayta ulanadigan WebSocket.
import { API_BASE } from './config.js';

const qs = new URLSearchParams(location.search);
export const API = (qs.get('api') || API_BASE || '').replace(/\/$/, '');
const DEV = qs.get('dev'); // faqat lokal testlar uchun: ?dev=123:Ali (server DEV_AUTH=1 boʻlsa)

export function initData() {
  if (DEV) return 'dev:' + DEV;
  const tg = window.Telegram && window.Telegram.WebApp;
  return (tg && tg.initData) || '';
}
export const onlineAvailable = () => !!API && !!initData();

export async function api(path, body) {
  const r = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'x-init-data': initData() },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* ignore */ }
  if (!r.ok) throw new Error((data && (data.error || data.msg)) || 'HTTP ' + r.status);
  return data;
}

/** Avtomatik qayta ulanadigan WebSocket. onStatus('open'|'reconnecting'|'closed'). */
export class Socket {
  constructor(path, onMsg, onStatus = () => {}, { reconnect = true } = {}) {
    this.path = path; this.onMsg = onMsg; this.onStatus = onStatus; this.reconnect = reconnect;
    this.closed = false; this.tries = 0; this.queue = [];
    this._open();
    this.pinger = setInterval(() => this.send({ t: 'ping' }), 25000);
  }
  _url() {
    const base = API.replace(/^http/, 'ws');
    return base + this.path + (this.path.includes('?') ? '&' : '?') + 'init=' + encodeURIComponent(initData());
  }
  _open() {
    const ws = this.ws = new WebSocket(this._url());
    ws.onopen = () => { this.tries = 0; this.onStatus('open'); for (const m of this.queue.splice(0)) ws.send(m); };
    ws.onmessage = (e) => { try { this.onMsg(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    ws.onclose = () => {
      if (this.closed) return;
      if (!this.reconnect) { this.onStatus('closed'); return; }
      this.onStatus('reconnecting');
      const delay = Math.min(8000, 500 * 2 ** this.tries++);
      setTimeout(() => { if (!this.closed) this._open(); }, delay);
    };
    ws.onerror = () => { /* onclose keyin keladi */ };
  }
  send(obj) {
    const s = JSON.stringify(obj);
    if (this.ws && this.ws.readyState === 1) this.ws.send(s);
    else if (obj.t !== 'ping') this.queue.push(s);
  }
  close() {
    this.closed = true; clearInterval(this.pinger);
    try { this.ws.close(); } catch (e) { /* ignore */ }
  }
}
