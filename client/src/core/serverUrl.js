import { CONFIG } from '../config.js';

/** Địa chỉ WebSocket của server: ?server=ws://host:cổng nếu có, không thì CONFIG.serverUrl. */
export function serverWsUrl(search = typeof location === 'undefined' ? '' : location.search) {
  return new URLSearchParams(search).get('server') ?? CONFIG.serverUrl;
}

/** Địa chỉ HTTP cùng cổng với WebSocket (giọng MC, báo lỗi, báo trạng thái). */
export function serverHttpUrl(search) {
  return serverWsUrl(search).replace(/^ws/, 'http');
}
