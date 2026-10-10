import {createRequest,httpUrl,clean,encodeEpisode,decodeEpisode} from './lib/cat.js';

function itemOf(vod={}){
 return {vod_id:String(vod.vod_id??vod.id??''),vod_name:clean(vod.vod_name??vod.name),vod_pic:String(vod.vod_pic??vod.pic??''),vod_remarks:clean(vod.vod_remarks??vod.vod_class??vod.vod_year??'')};
}
/** Pure Node adapter for public MacCMS JSON collection APIs (for example Jianpian). */
export function __jsEvalReturn(){
 const request=createRequest();let host='';
 function endpoint(params={}){const target=new URL('/api.php/provide/vod/',host);for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null&&value!=='')target.searchParams.set(key,String(value));return target.href;}
 async function api(params){const response=await request(endpoint(params));let json;try{json=JSON.parse(response.content);}catch{throw new Error('采集接口没有返回 JSON');}if(Number(json.code)===0)throw new Error('采集接口错误：'+(json.msg||'未知错误'));return json;}
 async function init(cfg){const ext=cfg.ext||{};host=httpUrl(typeof ext==='string'?ext:ext.host);}
 async function home(){const data=await api({ac:'list',pg:1});const classes=(data.class||[]).map(item=>({type_id:String(item.type_id),type_name:clean(item.type_name)}));return JSON.stringify({class:classes,list:(data.list||[]).map(itemOf)});}
 async function homeVod(){const data=await api({ac:'list',pg:1});return JSON.stringify({list:(data.list||[]).map(itemOf)});}
 async function category(tid,pg=1){if(!/^\d+$/.test(String(tid)))throw new Error('无效分类标识');const page=Math.max(1,Number(pg)||1),data=await api({ac:'list',t:tid,pg:page});return JSON.stringify({page,pagecount:Number(data.pagecount||page),limit:Number(data.limit||data.list?.length||0),total:Number(data.total||data.list?.length||0),list:(data.list||[]).map(itemOf)});}
 async function search(wd,quick=false,pg=1){if(!String(wd).trim())throw new Error('搜索词不能为空');const page=Math.max(1,Number(pg)||1),data=await api({ac:'list',wd,pg:page});return JSON.stringify({page,pagecount:Number(data.pagecount||page),limit:Number(data.limit||data.list?.length||0),total:Number(data.total||data.list?.length||0),list:(data.list||[]).map(itemOf)});}
 async function detail(id){if(!/^\d+$/.test(String(id)))throw new Error('无效视频标识');const data=await api({ac:'detail',ids:id});const vod=data.list?.[0];if(!vod)throw new Error('采集接口没有返回视频详情');const from=String(vod.vod_play_from||'在线播放').split('$$$');const groups=String(vod.vod_play_url||'').split('$$$');const urls=groups.map((group,index)=>group.split('#').filter(Boolean).map((part,episode)=>{const [name,...rest]=part.split('$');return clean(name||String(episode+1))+'$'+encodeEpisode({url:rest.join('$')});}).join('#'));
 if(!urls.some(Boolean))throw new Error('视频详情没有播放地址');return JSON.stringify({list:[{...itemOf(vod),vod_content:clean(vod.vod_content),vod_play_from:from.join('$$$'),vod_play_url:urls.join('$$$')}]});}
 async function play(flag,id){const episode=decodeEpisode(id),url=httpUrl(episode.url);return JSON.stringify({parse:0,url,header:{Referer:host}});}
 return {init,home,homeVod,category,search,detail,play};
}
