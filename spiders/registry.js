import {__jsEvalReturn as czzy} from '../czzy_open.js';
import {__jsEvalReturn as appget} from '../appget_open.js';
import {__jsEvalReturn as dm84} from '../dm84_open.js';
import {__jsEvalReturn as firstaid} from '../firstaid_open.js';
import {__jsEvalReturn as auete} from '../auete_open.js';
import {__jsEvalReturn as apprj} from '../apprj_open.js';
export const modules={'czzy_open.js':czzy,'appget_open.js':appget,'dm84_open.js':dm84,'firstaid_open.js':firstaid,'auete_open.js':auete,'apprj_open.js':apprj};
export function createRegistry(config,factories=modules){
 const instances=new Map(),sites=[];
 for(const site of config.video.sites){
  if(site.enable===false)continue;
  if(!/^[a-zA-Z0-9_-]+$/.test(site.key)||!factories[site.api]||site.type!==3)throw Error('订阅模块配置无效');
  if(instances.has(site.key))throw Error('站点 key 重复：'+site.key);
  const spider=factories[site.api]();let ready;
  // Share one initialization per site, retry after failure, and keep sites independent.
  const initialize=()=>ready||(ready=Promise.resolve().then(()=>spider.init({skey:site.key,stype:site.type,ext:site.ext})).catch(error=>{ready=null;throw error;}));
  const proxy={};for(const action of ['home','homeVod','category','search','detail','play'])if(typeof spider[action]==='function')proxy[action]=async(...args)=>{await initialize();return spider[action](...args);};
  instances.set(site.key,proxy);
  const {ext,api,...metadata}=site;
  sites.push({...metadata,enable:true,searchable:site.searchable??1,quickSearch:site.quickSearch??1,filterable:site.filterable??0,api:'/spider/'+site.key+'/3'});
 }
 return {instances,catalogue:{video:{sites}}};
}
