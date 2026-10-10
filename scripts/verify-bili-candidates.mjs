#!/usr/bin/env node
import fs from 'node:fs/promises';
import {__jsEvalReturn as bili} from '../bili_open.js';

const file=process.argv[2];
if(!file)throw new Error('Usage: node scripts/verify-bili-candidates.mjs <candidate.json>');
const config=JSON.parse(await fs.readFile(file,'utf8'));
const results=[];
for(const site of config.video?.sites||[]){
 if(site.api!=='bili_open.js')continue;
 const result={key:site.key,name:site.name,steps:{}};
 try{
  const spider=bili();await spider.init({ext:site.ext});result.steps.init='ok';
  const home=JSON.parse(await spider.home());result.steps.home={classes:home.class?.length||0,items:home.list?.length||0};
  const type=home.class?.find(item=>item.type_id!=='peizhi')?.type_id||home.class?.[0]?.type_id;
  const category=JSON.parse(await spider.category(type,1,false,{}));result.steps.category={type,items:category.list?.length||0};
  const search=JSON.parse(await spider.search(type||'纪录片'));result.steps.search={items:search.list?.length||0};
  const pick=search.list?.[0]||category.list?.[0]||home.list?.[0];
  if(!pick?.vod_id)throw new Error('没有可用于详情验证的视频');
  const detail=JSON.parse(await spider.detail(pick.vod_id)).list?.[0];result.steps.detail={id:pick.vod_id,episodes:detail?.vod_play_url?.split('#').length||0};
  const episode=detail?.vod_play_url?.split('#')[0]?.split('$').slice(1).join('$');if(!episode)throw new Error('详情没有播放标识');
  const play=JSON.parse(await spider.play('',episode));result.steps.play={url:Boolean(play.url),parse:play.parse};result.ok=true;
 }catch(error){result.ok=false;result.error=error.message;}
 results.push(result);console.log(JSON.stringify(result));
}
const pass=results.filter(item=>item.ok).length;
console.log(JSON.stringify({summary:{total:results.length,pass,failed:results.length-pass}}));
if(pass!==results.length)process.exitCode=1;
