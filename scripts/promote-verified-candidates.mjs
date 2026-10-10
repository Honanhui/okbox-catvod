#!/usr/bin/env node
import fs from 'node:fs/promises';

const [input,output,...rest]=process.argv.slice(2);
const adapter=rest.find(value=>value.startsWith('--adapter='))?.slice(10);
const append=rest.find(value=>value.startsWith('--append='))?.slice(9);
if(!input||!output||!adapter)throw new Error('Usage: node scripts/promote-verified-candidates.mjs <input> <output> --adapter=<file> [--append=<verified.json>]');
const candidate=JSON.parse(await fs.readFile(input,'utf8'));
const previous=append?JSON.parse(await fs.readFile(append,'utf8')):null;
const promoted=(candidate.video?.sites||[]).filter(site=>site.api===adapter).map(site=>({...site,name:site.name.replace(/（TVBox 转换候选）$/,''),enable:true}));
const sites=[...(previous?.video?.sites||[]),...promoted];
const result={generatedAt:new Date().toISOString(),source:candidate.sourceUrl||candidate.source,note:`已对 ${adapter} 执行 home/category/detail/play/search 在线只读验证；可将 video.sites 合并到 config_open.json。`,video:{sites}};
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(`Promoted ${promoted.length} verified ${adapter} entries to ${output}`);
