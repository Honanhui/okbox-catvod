#!/usr/bin/env node
/**
 * Extract CatVodOpen-compatible Node sources from a TVBox subscription.
 *
 * Only protocol families that this repository implements are emitted.  The
 * remaining csp_* entries require an independent Node adapter; renaming their
 * fields would not make them runnable.
 *
 * Usage:
 *   node scripts/convert-tvbox-subscription.mjs --input input.json --output candidate.json
 *   node scripts/convert-tvbox-subscription.mjs --input input.json --output candidate.json --repair-known-ext-key
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fetchTvboxConfig} from '../lib/tvbox-config.mjs';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node scripts/convert-tvbox-subscription.mjs (--input <tvbox.json> | --url <subscription-url>) --output <candidate.json> [--repair-known-ext-key]');
  process.exit(2);
}

const args = process.argv.slice(2);
const valueOf = flag => {
  const index = args.indexOf(flag);
  return index < 0 ? '' : args[index + 1] || '';
};
const input = valueOf('--input');
const sourceUrl = valueOf('--url');
const output = valueOf('--output');
if ((!input && !sourceUrl) || (input && sourceUrl) || !output) usage();

let config;
let resolvedUrl = '';
if (sourceUrl) {
  try {
    const loaded = await fetchTvboxConfig(sourceUrl);
    config = loaded.root;
    resolvedUrl = loaded.finalUrl;
  } catch (error) {
    usage(error.message);
  }
} else {
  let source = await fs.readFile(input, 'utf8');
  if (args.includes('--repair-known-ext-key')) {
    // One known upstream typo: a line begins with ext" instead of "ext".
    source = source.replace(/^(\s*)ext"\s*:/gm, '$1"ext":');
  }
  try {
    config = JSON.parse(source);
  } catch (error) {
    usage(`Input is not valid JSON: ${error.message}`);
  }
}
if (!Array.isArray(config.sites)) usage('Input does not contain a TVBox sites array.');

const supported = [];
const skipped = [];
const usedKeys = new Set();
const BUILTIN_ADAPTERS = {
  csp_NewCzGuard: {api: 'czzy_open.js', ext: {siteUrls: ['https://www.czzy89.com/', 'https://www.czzymovie.com/']}},
  csp_Czsapp: {api: 'czzy_open.js', ext: {siteUrls: ['https://www.czzy89.com/', 'https://www.czzymovie.com/']}},
  csp_Dm84Guard: {api: 'dm84_open.js', ext: {host: 'https://dm84.net'}},
  csp_Dm84: {api: 'dm84_open.js', ext: {host: 'https://dm84.net'}},
  csp_FirstAidGuard: {api: 'firstaid_open.js', ext: {host: 'https://m.youlai.cn'}},
  csp_FirstAid: {api: 'firstaid_open.js', ext: {host: 'https://m.youlai.cn'}},
  csp_AueteGuard: {api: 'auete_open.js', ext: {host: 'https://www.aeete.com'}}
};
function valueText(value) { return typeof value === 'string' ? value : JSON.stringify(value ?? ''); }
function nodeKey(item) {
  const extText = valueText(item.ext);
  const seed = `${item.key || ''}\u0000${item.name || ''}\u0000${extText}`;
  let hostname = '';
  try { hostname = new URL(extText.split('|', 1)[0]).hostname; } catch {}
  const ascii = (String(item.key || '').replace(/[^a-zA-Z0-9_-]/g, '') || hostname.replace(/[^a-zA-Z0-9_-]/g, '_')).toLowerCase();
  const stem = ascii || 'source';
  let value = `tvbox_${stem}_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 10)}`;
  while (usedKeys.has(value)) value += '_1';
  usedKeys.add(value);
  return value;
}
for (const item of config.sites) {
  const label = item.name || item.key || '未命名站点';
  const builtIn = BUILTIN_ADAPTERS[item.api];
  if (builtIn) {
    supported.push({
      key: nodeKey(item), name: `${label}（TVBox 转换候选）`, type: 3,
      api: builtIn.api, enable: false,
      searchable: item.searchable === 0 ? 0 : 1,
      quickSearch: item.quickSearch === 0 ? 0 : 1,
      filterable: item.filterable === 1 ? 1 : 0,
      ext: builtIn.ext
    });
    continue;
  }
  if (/^csp_Bili(?:Guard)?$/.test(item.api || '')) {
    const sourceExt = item.ext && typeof item.ext === 'object' ? item.ext : {};
    const json = sourceExt.json || sourceExt.catalogueUrl;
    if (json && !/^https?:\/\//.test(json)) {
      skipped.push({key:item.key,name:label,api:item.api,reason:'Bili 分类配置地址不是 HTTP(S) 地址'});
      continue;
    }
    supported.push({
      key:nodeKey(item),name:`${label}（TVBox 转换候选）`,type:3,api:'bili_open.js',enable:false,
      searchable:item.searchable===0?0:1,quickSearch:item.quickSearch===0?0:1,filterable:item.filterable===1?1:0,
      ext:json?{json}:{}
    });
    continue;
  }
  if (item.api === 'csp_AppGet' && typeof item.ext === 'string') {
    const [host, key, ...rest] = item.ext.trim().split('|');
    if (!/^https?:\/\//.test(host || '') || Buffer.byteLength(key || '') !== 16 || rest.length) {
      skipped.push({key: item.key, name: label, api: item.api, reason: 'AppGet ext 必须是“http(s) 地址|16字节密钥”'});
      continue;
    }
    supported.push({
      key: nodeKey(item),
      name: `${label}（TVBox 转换候选）`,
      type: 3,
      api: 'appget_open.js',
      enable: false,
      searchable: 1,
      quickSearch: 1,
      ext: {host, key, version: '120'}
    });
    continue;
  }
  if (item.api === 'csp_AppQi' && typeof item.ext === 'string') {
    const [host, key, ...rest] = item.ext.trim().split('|');
    if (!/^https?:\/\//.test(host || '') || Buffer.byteLength(key || '') !== 16 || rest.length) {
      skipped.push({key: item.key, name: label, api: item.api, reason: 'AppQi ext 必须是“http(s) 地址|16字节密钥”'});
      continue;
    }
    supported.push({
      key: nodeKey(item), name: `${label}（TVBox 转换候选）`, type: 3,
      api: 'appget_open.js', enable: false, searchable: 1, quickSearch: 1,
      ext: {host, key, protocol: 'qiji'}
    });
    continue;
  }
  skipped.push({
    key: item.key, name: label, api: item.api || '', reason: '当前 Node 项目没有该 TVBox csp/JAR/DRPY 协议的 Node 适配器'});
}

const result = {
  generatedAt: new Date().toISOString(),
  sourceFormat: 'TVBox',
  sourceUrl: resolvedUrl || undefined,
  note: '仅输出本项目已有 Node 协议适配器可承接的候选站点；enable=false，在线验证通过后再合入 config_open.json。',
  video: {sites: supported},
  skipped
};
await fs.mkdir(path.dirname(output), {recursive: true});
await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`Generated ${supported.length} Node candidates and recorded ${skipped.length} unsupported entries: ${output}`);
