import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {__jsEvalReturn as maccms} from '../maccms_open.js';
async function fixture(handler,task){const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{await task('http://127.0.0.1:'+server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}}
test('MacCMS completes home/category/detail/play/search without executing source scripts',async()=>{
 await fixture((req,res)=>{const url=new URL(req.url,'http://fixture'),p=url.searchParams;res.setHeader('content-type','application/json');
  if(p.get('ac')==='detail'){assert.equal(p.get('ids'),'7');res.end(JSON.stringify({code:1,list:[{vod_id:7,vod_name:'影片',vod_pic:'https://img.example/a.jpg',vod_play_from:'线路',vod_play_url:'第1集$https://media.example/a.m3u8?token=a%26b'}]}));return;}
  if(p.get('wd'))assert.equal(p.get('wd'),'影片');if(p.get('t'))assert.equal(p.get('t'),'1');
  res.end(JSON.stringify({code:1,pagecount:2,limit:20,total:30,class:[{type_id:1,type_name:'电影'}],list:[{vod_id:7,vod_name:'影片',vod_pic:'https://img.example/a.jpg'}]}));
 },async host=>{const spider=maccms();await spider.init({ext:{host}});assert.equal(JSON.parse(await spider.home()).class[0].type_name,'电影');assert.equal(JSON.parse(await spider.category('1')).list.length,1);assert.equal(JSON.parse(await spider.search('影片')).total,30);const detail=JSON.parse(await spider.detail('7')).list[0];const episode=detail.vod_play_url.split('$').slice(1).join('$');assert.equal(JSON.parse(await spider.play('',episode)).url,'https://media.example/a.m3u8?token=a%26b');await assert.rejects(()=>spider.detail('../7'),/无效/);});
});
