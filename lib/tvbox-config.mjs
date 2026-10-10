import crypto from 'node:crypto';

const DEFAULT_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9'
};
const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'okhttp/3.12.0',
  'okhttp/4.12.0'
];

export function stripJsonComments(value) {
  const text = String(value || '');
  let result = '', inString = false, escaped = false, lineComment = false, blockComment = false;
  for (let index = 0; index < text.length; index++) {
    const current = text[index], next = text[index + 1] || '';
    if (lineComment) {
      if (current === '\n' || current === '\r') { lineComment = false; result += current; }
      continue;
    }
    if (blockComment) {
      if (current === '*' && next === '/') { blockComment = false; index++; }
      continue;
    }
    if (inString) {
      result += current;
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') { inString = true; result += current; }
    else if (current === '/' && next === '/') { lineComment = true; index++; }
    else if (current === '/' && next === '*') { blockComment = true; index++; }
    else result += current;
  }
  if (blockComment) throw new Error('配置包含未闭合的块注释');
  return result;
}

function parseJsonLike(value) {
  const parsed = JSON.parse(stripJsonComments(String(value || '').replace(/^\uFEFF/, '').trim()));
  return typeof parsed === 'string' ? parseJsonLike(parsed) : parsed;
}

function padKey(value) {
  return Buffer.from(`${String(value || '')}0000000000000000`.slice(0, 16), 'utf8');
}

function decodeAesCbcConfig(value) {
  const compact = String(value || '').replace(/\s+/g, '');
  if (!/^2423[0-9a-f]+$/i.test(compact) || compact.length < 60 || compact.length % 2 !== 0) return value;
  const decoded = Buffer.from(compact, 'hex').toString('utf8').toLowerCase();
  const keyStart = decoded.indexOf('$#'), keyEnd = decoded.indexOf('#$');
  if (keyStart < 0 || keyEnd <= keyStart || decoded.length < 13) return value;
  const payloadStart = compact.indexOf('2324') + 4, payloadEnd = compact.length - 26;
  if (payloadStart < 4 || payloadEnd <= payloadStart || (payloadEnd - payloadStart) % 2) return value;
  try {
    const decipher = crypto.createDecipheriv('aes-128-cbc', padKey(decoded.slice(keyStart + 2, keyEnd)), padKey(decoded.slice(-13)));
    return Buffer.concat([decipher.update(Buffer.from(compact.slice(payloadStart, payloadEnd), 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return value;
  }
}

function decodeMarkedBase64(value) {
  const text = String(value || '');
  const marker = text.match(/[A-Za-z0-9]{8}\*\*/)?.[0];
  if (!marker) return value;
  const payload = text.slice(text.indexOf(marker) + marker.length).trim();
  try { return Buffer.from(payload, 'base64').toString('utf8'); } catch { return value; }
}

/** Decode the config encodings accepted by the Android/FongMi Bridge. */
export function decodeTvboxConfig(raw) {
  let value = String(raw || '').replace(/^\uFEFF/, '').trim();
  if (!value) throw new Error('TVBox 配置响应为空');
  try { return parseJsonLike(value); } catch {}
  if (value.includes('**')) value = String(decodeMarkedBase64(value)).trim();
  if (value.startsWith('2423')) value = String(decodeAesCbcConfig(value)).trim();
  try { return parseJsonLike(value); } catch {}
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) value = decoded.trim();
  } catch {}
  try { return parseJsonLike(value); } catch {}
  try {
    const wrapped = value.match(/^base64\((.*)\)$/is)?.[1] || value.replace(/^base64:\/\//i, '');
    return parseJsonLike(Buffer.from(wrapped, 'base64').toString('utf8').replace(/^\uFEFF/, '').trim());
  } catch {
    throw new Error('TVBox 配置不是有效 JSON、Base64 JSON 或 FongMi 加密配置');
  }
}

export function resolveRelativeConfigValues(value, baseUrl) {
  if (Array.isArray(value)) return value.map(item => resolveRelativeConfigValues(item, baseUrl));
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string' || !/^(?:\.\/|\.\.\/)/.test(value.trim())) return value;
    try { return new URL(value, baseUrl).toString(); } catch { return value; }
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveRelativeConfigValues(item, baseUrl)]));
}

function isHtml(value) {
  return /<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(String(value || '').slice(0, 4000));
}

/**
 * Fetch and decode a TVBox config exactly as the Android Bridge does for
 * ordinary configuration payloads. It intentionally returns configuration
 * data only; it never executes a remote TVBox JAR or DRPY script.
 */
export async function fetchTvboxConfig(url, options = {}) {
  const fetcher = options.fetcher || fetch;
  const timeoutMs = Number(options.timeoutMs || 15000);
  const userAgents = options.userAgents || DEFAULT_USER_AGENTS;
  let lastFailure = '未知错误';
  for (const userAgent of userAgents) {
    try {
      const response = await fetcher(url, {
        redirect: 'follow',
        headers: {...DEFAULT_HEADERS, 'user-agent': userAgent},
        signal: AbortSignal.timeout(timeoutMs)
      });
      const raw = await response.text();
      if (!response.ok) { lastFailure = `HTTP ${response.status}`; continue; }
      if (isHtml(raw)) { lastFailure = '上游返回网页首页'; continue; }
      const root = resolveRelativeConfigValues(decodeTvboxConfig(raw), response.url || url);
      if (!Array.isArray(root?.sites) && !Array.isArray(root)) throw new Error('TVBox 配置中没有 sites 数组');
      return {root, finalUrl: response.url || url, userAgent, contentType: response.headers.get('content-type') || ''};
    } catch (error) {
      lastFailure = error?.name === 'TimeoutError' ? '连接超时' : error.message || String(error);
    }
  }
  throw new Error(`无法按 Android Bridge 规则读取配置：${lastFailure}`);
}
