import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {__jsEvalReturn as bili} from '../bili_open.js';

async function fixture(handler,task){
 const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await task('http://127.0.0.1:'+server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}
}

test('Bili preserves TVBox category data and completes home/category/detail/play/search through public API protocol',async()=>{
 await fixture((req,res)=>{
  const url=new URL(req.url,'http://fixture');res.setHeader('content-type','application/json');
  if(url.pathname==='/categories.json'){res.end(JSON.stringify({class:[{type_id:'纪录片',type_name:'纪录片'}],filters:{纪录片:[{key:'duration',name:'时长',value:[{n:'全部',v:'0'}]}]}}));return;}
  if(url.pathname==='/x/web-interface/index/top/rcmd'){res.end(JSON.stringify({code:0,data:{item:[{bvid:'BVhome',title:'<em>首页影片</em>',pic:'//img.example/home.jpg',duration:'10:00'}]}}));return;}
  if(url.pathname==='/x/web-interface/search/type'){
   assert.equal(url.searchParams.get('search_type'),'video');assert.equal(url.searchParams.get('keyword'),'纪录片');
   assert.equal(url.searchParams.get('order'),url.searchParams.get('page')==='2'?'pubdate':'totalrank');
   res.end(JSON.stringify({code:0,data:{numPages:3,numResults:23,result:[{bvid:'BVsearch',title:'<em>分类影片</em>',pic:'//img.example/search.jpg',duration:'20:00',author:'作者'}]}}));return;
  }
  if(url.pathname==='/x/web-interface/view'){assert.equal(url.searchParams.get('bvid'),'BVsearch');res.end(JSON.stringify({code:0,data:{aid:9,bvid:'BVsearch',title:'详情影片',pic:'//img.example/detail.jpg',desc:'简介',tname:'纪录片',pages:[{cid:10,page:1,part:'正片'}]}}));return;}
  if(url.pathname==='/x/player/playurl'){assert.equal(url.searchParams.get('avid'),'9');assert.equal(url.searchParams.get('cid'),'10');res.end(JSON.stringify({code:0,data:{durl:[{url:'https://media.example/video.m3u8'}]}}));return;}
  res.statusCode=404;res.end('{}');
 },async host=>{
  const spider=bili();await spider.init({ext:{apiBase:host,json:host+'/categories.json'}});
  const home=JSON.parse(await spider.home());assert.equal(home.class[0].type_name,'纪录片');assert.equal(home.list[0].vod_pic,'https://img.example/home.jpg');
  const category=JSON.parse(await spider.category('纪录片',2,false,{order:'pubdate'}));assert.equal(category.page,2);assert.equal(category.pagecount,3);assert.equal(category.list[0].vod_id,'BVsearch');
  const searched=JSON.parse(await spider.search('纪录片'));assert.equal(searched.list[0].vod_name,'分类影片');
  const detail=JSON.parse(await spider.detail('BVsearch')).list[0];assert.equal(detail.vod_name,'详情影片');
  const episode=detail.vod_play_url.split('$').slice(1).join('$');const play=JSON.parse(await spider.play('Bilibili',episode));assert.equal(play.url,'https://media.example/video.m3u8');
 });
});

test('Bili rejects malformed video identifiers and unsafe episode payloads',async()=>{
 const spider=bili();await spider.init({ext:{apiBase:'https://api.bilibili.com'}});
 await assert.rejects(()=>spider.detail('../bad'),/无效/);
 await assert.rejects(()=>spider.play('', 'okbox:'+Buffer.from(JSON.stringify({aid:'../1',cid:'2'})).toString('base64url')),/无效/);
});
