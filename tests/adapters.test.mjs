import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createCipheriv} from 'node:crypto';
import {decodePlayerPayload} from '../czzy_open.js';
import {__jsEvalReturn as appget} from '../appget_open.js';
import {__jsEvalReturn as czzy} from '../czzy_open.js';
import {aesEncrypt,aesDecrypt,encodeEpisode,decodeEpisode} from '../lib/cat.js';
const key='1234567887654321';
async function fixture(handler,task){const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{await task('http://127.0.0.1:'+server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}}
test('AppGet keeps separate protocol state, uses signed playback and survives episode separators',async()=>{
 await fixture(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;let data;
  if(req.url==='/playlist'){res.setHeader('content-type','application/vnd.apple.mpegurl');res.end('#EXTM3U\n#EXTINF:2,\nsegment.ts');return;}
  if(req.url.endsWith('initV119'))data={type_list:[{type_id:1,type_name:'电影'}],recommend_list:[{vod_id:7,vod_name:'视频'}]};
  else if(req.url.includes('typeFilterVodList'))data={recommend_list:[{vod_id:7,vod_name:'视频'}]};
  else if(req.url.endsWith('searchList')){assert.equal(JSON.parse(raw).keywords,'测试');data={search_list:[{vod_id:7,vod_name:'视频'}]};}
  else if(req.url.endsWith('vodDetail'))data={vod:{vod_id:7,vod_name:'视频',vod_play_list:[{player_info:{show:'线路',parse:'parser'},urls:[{name:'第一集',url:'https://example.com/$$$#a',token:'a+b&x'}]}]}};
  else if(req.url.endsWith('vodParse')){assert.equal(aesDecrypt(req.headers['app-api-verify-sign'],key),req.headers['app-api-verify-time']);const body=new URLSearchParams(raw);assert.equal(body.get('token'),'a+b&x');assert.equal(aesDecrypt(body.get('url'),key),'https://example.com/$$$#a');data={json:JSON.stringify({url:'https://media.example/test.m3u8'})};}
  else{res.statusCode=404;res.end();return;}res.setHeader('content-type','application/json');res.end(JSON.stringify({data:aesEncrypt(JSON.stringify(data),key)}));
 },async host=>{const a=appget();await a.init({ext:{host,key}});assert.equal(JSON.parse(await a.home()).class[0].type_id,'1');assert.equal(JSON.parse(await a.category('1')).list.length,1);assert.equal(JSON.parse(await a.search('测试')).list.length,1);const detail=JSON.parse(await a.detail('7')).list[0];const episode=detail.vod_play_url.split('$').slice(1).join('$');assert.equal(JSON.parse(await a.play('线路',episode)).url,'https://media.example/test.m3u8');assert.equal(JSON.parse(await a.play('',encodeEpisode({parseApi:host+'/playlist'}))).url,host+'/playlist');const b=appget();await b.init({ext:{host,key:'1111111111111111'}});await assert.rejects(()=>b.home(),/解密失败/);assert.equal(JSON.parse(await a.home()).list.length,1);});
});
test('厂长 follows entry redirect, parses lists/detail and returns direct media',async()=>{
 await fixture((req,res)=>{if(req.url==='/entry'){res.writeHead(302,{location:'/'});res.end();return;}res.setHeader('content-type','text/html');if(req.url.startsWith('/v_play/')){res.end('<video src="https://media.example/cz.m3u8"></video>');return;}if(req.url.startsWith('/movie/')){res.end('<div class="moviedteail_tt"><h1>测试影片</h1></div><div class="paly_list_btn"><a href="/v_play/abc.html">第1集</a></div>');return;}res.end('<a cat-url="/movie_bt/movie_bt_series/dianying">电影</a><li><a href="/movie/7.html" title="测试影片"><img src="/image.jpg"></a></li>');},async host=>{const a=czzy();await a.init({ext:{siteUrls:[host+'/entry']}});assert.equal(JSON.parse(await a.home()).class[0].type_id,'dianying');assert.equal(JSON.parse(await a.search('测试')).list.length,1);assert.equal(JSON.parse(await a.category('dianying')).list.length,1);const detail=JSON.parse(await a.detail('7')).list[0];const episode=detail.vod_play_url.split('$')[1];assert.equal(JSON.parse(await a.play('',episode)).url,'https://media.example/cz.m3u8');await assert.rejects(()=>a.detail('../x'),/无效/);});
});
test('episode payloads preserve special characters',()=>{const value={url:'a$#|中文',token:'a+b&='};assert.deepEqual(decodeEpisode(encodeEpisode(value)),value);});
test('厂长 AES player accepts its page IV and rejects corrupt ciphertext',()=>{
 const iv='0123456789abcdef',cipher=createCipheriv('aes-128-cbc',Buffer.from('VFBTzdujpR9FWBhe'),Buffer.from(iv));
 const payload=Buffer.concat([cipher.update(JSON.stringify({url:'https://media.example/a.m3u8'})),cipher.final()]).toString('base64');
 assert.equal(decodePlayerPayload(`var player = "${payload}"; var rand = "${iv}";`),'https://media.example/a.m3u8');
 assert.throws(()=>decodePlayerPayload(`var player = "AAAA"; var rand = "${iv}";`),/解密失败/);
 assert.equal(decodePlayerPayload('<html></html>'),'');
});
