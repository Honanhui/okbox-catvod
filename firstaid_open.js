import {createRequest,load,httpUrl,clean,encodeEpisode,decodeEpisode,UA} from './lib/cat.js';
const categoryNames=['急救技能','家庭生活','急危重症','常见损伤','动物致伤','海洋急救','中毒急救','意外事故'];
export function __jsEvalReturn(){
 const request=createRequest();let host,cache,pending;
 async function init(cfg){host=new URL(httpUrl(cfg.ext.host)).origin;}
 async function catalogue(){if(cache&&Date.now()-cache.at<15*60000)return cache;if(!pending)pending=(async()=>{const response=await request(host+'/jijiu/');const $=load(response.content),groups=[];$('.jj-title-li').each((index,element)=>{const banner=$(element).prev().find('img').attr('src');const rows=[];$(element).find('a[href]').each((_,link)=>{const a=$(link),path=a.attr('href');if(!/^\/jijiu\/article\/[\w-]+\.html$/.test(path))return;rows.push({vod_id:path,vod_name:clean(a.text()),vod_pic:banner?httpUrl(banner,host):'',vod_remarks:'急救教学'});});groups.push(rows);});if(!groups.some(x=>x.length))throw Error('急救教学栏目结构已更新');cache={at:Date.now(),groups};return cache;})().finally(()=>{pending=null;});return pending;}
 async function home(){const {groups}=await catalogue();return JSON.stringify({class:groups.map((_,i)=>({type_id:String(i),type_name:categoryNames[i]||'栏目'+(i+1)})),list:groups.flat().slice(0,24)});}
 async function category(id,pg=1){const {groups}=await catalogue();if(!/^\d+$/.test(id)||!groups[Number(id)])throw Error('无效急救栏目');pg=Math.max(1,Number(pg)||1);const all=groups[Number(id)],limit=24;return JSON.stringify({page:pg,pagecount:Math.max(1,Math.ceil(all.length/limit)),total:all.length,limit,list:all.slice((pg-1)*limit,pg*limit)});}
 async function search(wd,quick=false,pg=1){const {groups}=await catalogue();pg=Math.max(1,Number(pg)||1);const rows=groups.flat().filter(x=>x.vod_name.includes(String(wd).trim()));return JSON.stringify({page:pg,pagecount:Math.max(1,Math.ceil(rows.length/24)),total:rows.length,list:rows.slice((pg-1)*24,pg*24)});}
 async function media(path){if(!/^\/jijiu\/article\/[\w-]+\.html$/.test(path))throw Error('无效急救视频标识');const response=await request(host+path),$=load(response.content),src=$('#video source').attr('src')||$('#video').attr('src');if(!src)throw Error('该教学页面没有视频');return {url:httpUrl(src,response.url),pic:$('#video').attr('poster')||'',title:$('title').text().trim(),referer:response.url};}
 async function detail(id){const value=await media(id);return JSON.stringify({list:[{vod_id:id,vod_name:value.title,vod_pic:value.pic,vod_play_from:'有来医生',vod_play_url:'播放$'+encodeEpisode({path:id})}]});}
 async function play(flag,id){const value=await media(decodeEpisode(id).path);return JSON.stringify({parse:0,url:value.url,header:{'User-Agent':UA,Referer:value.referer}});}
 return {init,home,category,search,detail,play};
}
