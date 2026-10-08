import http from 'node:http';
import config from './config_open.json' with {type:'json'};
import {__jsEvalReturn as czzy} from './czzy_open.js';
import {__jsEvalReturn as appget} from './appget_open.js';
const factories={'czzy_open.js':czzy,'appget_open.js':appget};
export async function createApp(){
 const instances=new Map();
 for(const site of config.video.sites){if(!/^[a-zA-Z0-9_-]+$/.test(site.key)||!factories[site.api])throw new Error('订阅模块配置无效');const spider=factories[site.api]();await spider.init({skey:site.key,stype:site.type,ext:site.ext});instances.set(site.key,spider);}
 const catalogue={video:{sites:config.video.sites.map(({ext,api,...site})=>({...site,searchable:1,filterable:1,api:'/spider/'+site.key+'/3'}))}};
 const server=http.createServer(async(req,res)=>{res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/health'||path==='/check'){res.end(JSON.stringify({ok:true,version:'0.1',sites:instances.size}));return;}
  if(path==='/config'){res.end(JSON.stringify(catalogue));return;}
  const match=path.match(/^\/spider\/([\w-]+)\/3\/(init|home|category|search|detail|play)$/);if(!match||req.method!=='POST'||!instances.has(match[1])){res.statusCode=404;res.end(JSON.stringify({error:'接口不存在'}));return;}
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)throw new Error('请求过大');}const body=raw?JSON.parse(raw):{},spider=instances.get(match[1]);let result;
  switch(match[2]){case 'init':result={};break;case 'home':{const home=JSON.parse(await spider.home());if(!home.list?.length&&spider.homeVod){const vod=JSON.parse(await spider.homeVod());home.list=vod.list||[];}result=home;break;}case 'category':result=await spider.category(body.id,body.page||1,true,body.filters||body.extend||{});break;case 'search':result=await spider.search(body.wd||'',body.quick,body.page||1);break;case 'detail':result=await spider.detail(String(body.id||''));break;case 'play':result=await spider.play(body.flag||'',body.id);break;}
  res.end(typeof result==='string'?result:JSON.stringify(result));
 }catch(error){res.statusCode=502;res.end(JSON.stringify({error:String(error.message).replace(/https?:\/\/\S+/g,'[源站地址]').slice(0,200)}));}});
 return {server,catalogue,instances};
}
// Bundled output is CommonJS and runs directly inside the Docker Cat loader.
if(process.env.CATVOD_DISABLE_AUTOSTART!=='1'){
 createApp().then(({server})=>{server.listen(Number(process.env.PORT||9988),process.env.HOST||'127.0.0.1');
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));}).catch(()=>{console.error('Cat subscription failed to start');process.exit(1)});
}
