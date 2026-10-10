import {createRequest,httpUrl,clean,encodeEpisode,decodeEpisode} from './lib/cat.js';

const DEFAULT_CLASSES=[
 {type_id:'电影',type_name:'电影'}, {type_id:'电视剧',type_name:'电视剧'},
 {type_id:'动画',type_name:'动画'}, {type_id:'纪录片',type_name:'纪录片'},
 {type_id:'音乐',type_name:'音乐'}
];

function text(value){return clean(String(value??'').replace(/<[^>]*>/g,''));}
function image(value){
 const source=String(value??'');
 return source.startsWith('//')?'https:'+source:source;
}
function video(item={}){
 return {
  vod_id:item.bvid||item.aid||item.id||'', vod_name:text(item.title||item.name),
  vod_pic:image(item.pic||item.cover), vod_remarks:text(item.duration||item.pubdate||item.author||item.owner?.name||'')
 };
}

/**
 * Node implementation of the public Bilibili API protocol used by csp_Bili.
 * The optional ext.json is a TVBox Bili category/filter document; it is data,
 * never evaluated as JavaScript.
 */
export function __jsEvalReturn(){
 const request=createRequest(); let apiBase='https://api.bilibili.com', catalogue={class:DEFAULT_CLASSES,filters:{}},cookie='';
 const browserUA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';
 function endpoint(path,params={}){
  const target=new URL(path,httpUrl(apiBase));
  for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null&&value!=='')target.searchParams.set(key,String(value));
  return target.href;
 }
 async function api(path,params){
  const headers={'User-Agent':browserUA,referer:'https://www.bilibili.com/'};if(cookie)headers.cookie=cookie;
  const response=await request(endpoint(path,params),{headers});
  let parsed;try{parsed=JSON.parse(response.content);}catch{throw new Error('Bilibili 接口没有返回 JSON');}
  if(parsed.code&&parsed.code!==0)throw new Error('Bilibili 接口错误 '+parsed.code+(parsed.message?': '+parsed.message:''));
  return parsed.data??parsed.result??parsed;
 }
 async function init(cfg){
  const ext=cfg.ext||{};
  apiBase=httpUrl(typeof ext==='string'?'https://api.bilibili.com':ext.apiBase||'https://api.bilibili.com');
  cookie=typeof ext==='object'?String(ext.cookie||''):'';
  if(!cookie&&new URL(apiBase).hostname==='api.bilibili.com'){
   const response=await request('https://www.bilibili.com/',{headers:{'User-Agent':browserUA}});
   cookie=response.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
  }
  const configUrl=typeof ext==='object'?(ext.json||ext.catalogueUrl):'';
  if(!configUrl)return;
  const response=await request(httpUrl(configUrl),{headers:{referer:'https://www.bilibili.com/'}});
  let data;try{data=JSON.parse(response.content);}catch{throw new Error('Bili 分类配置不是 JSON');}
  if(!Array.isArray(data.class))throw new Error('Bili 分类配置缺少 class');
  catalogue={class:data.class.map(item=>({type_id:String(item.type_id),type_name:text(item.type_name)})),filters:data.filters||{}};
 }
 function listOf(data){return (data?.result||data?.item||data?.list||[]).map(video).filter(item=>item.vod_id&&item.vod_name);}
 async function home(){
  const data=await api('/x/web-interface/index/top/rcmd',{ps:14,fresh_idx:1,fresh_idx_1h:1});
  return JSON.stringify({class:catalogue.class,filters:catalogue.filters,list:listOf(data)});
 }
 async function homeVod(){
  const data=await api('/x/web-interface/index/top/rcmd',{ps:14,fresh_idx:1,fresh_idx_1h:1});
  return JSON.stringify({list:listOf(data)});
 }
 async function query(keyword,pg=1,extend={}){
  if(!String(keyword).trim())throw new Error('搜索词不能为空');
  const data=await api('/x/web-interface/search/type',{
   search_type:'video',keyword, page:Math.max(1,Number(pg)||1), page_size:20,
   order:extend.order||'totalrank', duration:extend.duration||0
  });
  const videos=listOf(data), page=Math.max(1,Number(pg)||1), pages=Number(data?.numPages||data?.num_pages||0);
  return {page,pagecount:pages||page,limit:20,total:Number(data?.numResults||data?.num_results||videos.length),list:videos};
 }
 async function category(tid,pg=1,filter=false,extend={}){
  const selected=extend?.tid||tid;
  return JSON.stringify(await query(selected,pg,extend||{}));
 }
 async function search(wd,quick=false,pg=1){return JSON.stringify(await query(wd,pg,{}));}
 async function detail(id){
  if(!/^(BV[\w]+|av\d+|\d+)$/i.test(String(id)))throw new Error('无效的 Bilibili 视频标识');
  const data=await api('/x/web-interface/view',String(id).toLowerCase().startsWith('bv')?{bvid:id}:{aid:String(id).replace(/^av/i,'')});
  const pages=Array.isArray(data.pages)&&data.pages.length?data.pages:[{cid:data.cid,page:1,part:data.title}];
  const aid=data.aid||String(id).replace(/^av/i,'');
  const episodes=pages.filter(page=>page.cid).map((page,index)=>clean(page.part||('第'+(page.page||index+1)+'集'))+'$'+encodeEpisode({aid,cid:page.cid,bvid:data.bvid||id}));
  if(!episodes.length)throw new Error('Bilibili 详情没有可播放分集');
  return JSON.stringify({list:[{vod_id:data.bvid||String(id),vod_name:text(data.title),vod_pic:image(data.pic),vod_content:text(data.desc),vod_remarks:text(data.tname),vod_play_from:'Bilibili',vod_play_url:episodes.join('#')}]});
 }
 async function play(flag,id){
  const episode=decodeEpisode(id);
  if(!/^[\w-]+$/.test(String(episode.aid))||!/^[\w-]+$/.test(String(episode.cid)))throw new Error('无效的 Bilibili 分集标识');
  const data=await api('/x/player/playurl',{avid:episode.aid,cid:episode.cid,qn:80,fnval:0,fourk:1});
  const url=data?.durl?.[0]?.url||data?.dash?.video?.[0]?.baseUrl||data?.dash?.video?.[0]?.base_url;
  if(!url)throw new Error('Bilibili 没有返回可播放地址');
  return JSON.stringify({parse:0,url:httpUrl(url),header:{Referer:'https://www.bilibili.com/','User-Agent':'Mozilla/5.0'}});
 }
 return {init,home,homeVod,category,search,detail,play};
}
