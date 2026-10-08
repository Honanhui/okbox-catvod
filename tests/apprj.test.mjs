import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import {__jsEvalReturn as apprj} from '../apprj_open.js';
import {__jsEvalReturn as appget} from '../appget_open.js';
import {aesEncrypt} from '../lib/cat.js';
async function fixture(handler,task){const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await task('http://127.0.0.1:'+server.address().port);}finally{await new Promise(r=>server.close(r));}}
test('AppRJ signs multipart API calls, keeps filters and follows signed parsers',async()=>{
 const secret='public-test-key';let host;
 await fixture(async(req,res)=>{if(req.url.startsWith('/parse')){const u=new URL(req.url,host);assert.equal(u.searchParams.get('url'),'opaque|value');assert.equal(u.searchParams.get('sign'),crypto.createHash('md5').update(secret+u.searchParams.get('timestamp')).digest('hex'));res.end(JSON.stringify({url:'https://media.example/a.m3u8',UA:'SourceUA'}));return;}let raw='';for await(const c of req)raw+=c;assert.match(req.headers['content-type'],/multipart\/form-data/);const ts=raw.match(/name="timestamp"\r\n\r\n(\d+)/)?.[1];assert.ok(ts);assert.ok(raw.includes(crypto.createHash('md5').update(secret+ts).digest('hex')));let data;if(req.url.endsWith('top_type'))data={list:[{type_id:1,type_name:'电影',extend:['全部','动作']}]};else if(req.url.endsWith('vod_details'))data={vod_id:7,vod_name:'影片',vod_play_list:[{name:'线路',ua:'UA',parse_urls:[host+'/parse?url='],urls:[{name:'1',url:'opaque|value'}]}]};else data={list:[{vod_id:7,vod_name:'影片'}]};res.end(JSON.stringify({code:1,data}));},async base=>{host=base;const a=apprj();await a.init({ext:{host,signKey:secret}});const home=JSON.parse(await a.home());assert.equal(home.filters['1'][0].value[0].v,'');assert.equal(JSON.parse(await a.search('影片')).list.length,1);const d=JSON.parse(await a.detail('7')).list[0],p=JSON.parse(await a.play('',d.vod_play_url.split('$')[1]));assert.equal(p.url,'https://media.example/a.m3u8');assert.equal(p.header['User-Agent'],'SourceUA');});
});
test('Qiji uses separate API namespace and init version while preserving AppGet behavior',async()=>{
 const key='1234567887654321';
 await fixture((req,res)=>{assert.match(req.url,/^\/api\.php\/qijiappapi\.index\//);assert.equal(req.headers['content-type'],'application/json');const data=req.url.endsWith('initV120')?{type_list:[{type_id:1,type_name:'电影'}],recommend_list:[{vod_id:1,vod_name:'影片'}]}:{search_list:[{vod_id:1,vod_name:'影片'}]};res.end(JSON.stringify({data:aesEncrypt(JSON.stringify(data),key)}));},async host=>{const a=appget();await a.init({ext:{host,key,protocol:'qiji'}});assert.equal(JSON.parse(await a.home()).list.length,1);assert.equal(JSON.parse(await a.search('影片')).list.length,1);});
});
