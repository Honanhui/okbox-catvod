import {createRequest,aesDecrypt,aesEncrypt,encodeEpisode,decodeEpisode,clean,httpUrl,UA} from './lib/cat.js';
export function __jsEvalReturn(){
 const request=createRequest();let host,key,version,token;
 async function init(cfg){const ext=typeof cfg.ext==='string'?JSON.parse(cfg.ext):cfg.ext;host=httpUrl(ext.host).replace(/\/$/,'');key=ext.key;version=String(ext.version||'120');token=ext.token||'';if(Buffer.byteLength(key)!==16)throw new Error('AppGet 公开协议密钥必须为16字节');}
 async function api(path,body={},signed=false){
  const timestamp=String(Math.floor(Date.now()/1000));
  const headers={'user-agent':'okhttp/3.14.9','content-type':'application/json','app-user-device-id':'2e714ed1a871e3291b797524842448850','app-version-code':version,'app-api-verify-time':timestamp,'app-ui-mode':'light','app-user-token':token};
  if(signed){headers['app-api-verify-sign']=aesEncrypt(timestamp,key);headers['content-type']='application/x-www-form-urlencoded';}
  const response=await request(host+'/api.php/getappapi.index/'+path,{method:'POST',headers,body:signed?body:JSON.stringify(body)});
  let root;try{root=JSON.parse(response.content);}catch{throw new Error('AppGet 返回的不是 JSON');}
  if(typeof root.data==='string'){try{return JSON.parse(aesDecrypt(root.data,key));}catch{throw new Error('AppGet 响应解密失败，可能已更新协议或密钥');}}
  if(root.data&&typeof root.data==='object')return root.data;
  throw new Error('AppGet 响应没有有效数据');
 }
 function videos(list=[]){return list.map(x=>({vod_id:String(x.vod_id),vod_name:clean(x.vod_name),vod_pic:x.vod_pic||'',vod_remarks:x.vod_remarks||''}));}
 function paged(list,page){return {page:Number(page),pagecount:list.length?Number(page)+1:Number(page),limit:list.length,total:list.length,list};}
 async function home(){const data=await api('initV119');const classes=(data.type_list||[]).filter(x=>Number(x.type_id)>0);return JSON.stringify({class:classes.map(x=>({type_id:String(x.type_id),type_name:x.type_name})),list:videos(data.recommend_list||[])});}
 async function homeVod(){const value=JSON.parse(await home());return JSON.stringify({list:value.list});}
 async function category(tid,page=1,filter=false,extend={}){const data=await api('typeFilterVodList?page='+Number(page),{...extend,type_id:String(tid)});return JSON.stringify(paged(videos(data.recommend_list||[]),page));}
 async function search(wd,quick=false,page=1){const data=await api('searchList',{type_id:'0',keywords:wd,page:String(page)});return JSON.stringify(paged(videos(data.search_list||[]),page));}
 async function detail(id){const data=await api('vodDetail',{vod_id:String(id)});const vod=data.vod;if(!vod)throw new Error('源站没有返回视频详情');
  const flags=[],groups=[];
  for(const line of vod.vod_play_list||data.vod_play_list||[]){flags.push(clean(line.player_info?.show||line.from||'线路 '+(flags.length+1)));groups.push((line.urls||[]).map((episode,index)=>clean(episode.name||String(index+1))+'$'+encodeEpisode({url:episode.url||'',parseApi:episode.parse_api_url||'',parse:line.player_info?.parse||'',token:episode.token||''})).join('#'));}
  if(!groups.length)throw new Error('源站详情没有集数');
  return JSON.stringify({list:[{...videos([vod])[0],vod_content:vod.vod_content||'',vod_actor:vod.vod_actor||'',vod_director:vod.vod_director||'',vod_play_from:flags.join('$$$'),vod_play_url:groups.join('$$$')}]});
 }
 async function play(flag,id){const episode=decodeEpisode(id);let url;
  if(episode.parseApi){const endpoint=httpUrl(episode.parseApi);if(/\.(m3u8|mp4)(?:\?|$)/i.test(new URL(endpoint).pathname))url=endpoint;else{const response=await request(endpoint);if(response.content.trimStart().startsWith('#EXTM3U'))url=response.url;else{const root=JSON.parse(response.content);url=root.url||root.data?.url;}}}
  else{const body=new URLSearchParams({parse_api:episode.parse,url:aesEncrypt(episode.url,key),token:episode.token}).toString();const data=await api('vodParse',body,true);const root=typeof data.json==='string'?JSON.parse(data.json):data.json||data;url=root.url;}
  if(!url&&/^https?:/.test(episode.url)&&!episode.parse)url=episode.url;
  if(!url)throw new Error('该线路未返回播放地址');url=httpUrl(url);return JSON.stringify({parse:0,url,header:{'User-Agent':UA}});
 }
 return {init,home,homeVod,category,search,detail,play};
}
