import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
process.env.CATVOD_DISABLE_AUTOSTART='1';
const {createApp}=await import('../index.js');const {instances,catalogue}=await createApp();const results=[];
for(const site of catalogue.video.sites.filter(s=>!process.env.SITE_KEYS||process.env.SITE_KEYS.split(',').includes(s.key))){const spider=instances.get(site.key),row={key:site.key,name:site.name,checkedAt:new Date().toISOString(),state:'failed'};
 try{
  const home=JSON.parse(await spider.home());row.classes=home.class?.length||0;row.home=home.list?.length||0;
  if(home.class?.length){try{const category=JSON.parse(await spider.category(home.class[0].type_id,1,true,{}));row.category=category.list?.length||0;}catch(error){row.categoryError=error.message;}}
  try{const search=JSON.parse(await spider.search(site.key==='dm84'?'斗罗':site.key==='firstaid'?'人工呼吸':'庆余年',false,1));row.search=search.list?.length||0;}catch(error){row.searchError=error.message;}
  const videos=home.list?.length?home.list:JSON.parse(await spider.homeVod()).list;
  let success=false;const attempts=[];
  for(const video of (videos||[]).slice(0,3)){try{const detail=JSON.parse(await spider.detail(video.vod_id)).list[0];row.detail=true;const groups=detail.vod_play_url.split('$$$'),flags=detail.vod_play_from.split('$$$');row.lines=groups.length;
   for(let line=0;line<Math.min(3,groups.length)&&!success;line++)try{const first=groups[line].split('#')[0],id=first.slice(first.indexOf('$')+1);const player=JSON.parse(await spider.play(flags[line],id));const response=await fetch(player.url,{headers:player.header||{},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('播放资源 HTTP '+response.status);const reader=response.body.getReader();let prefix='';while(prefix.length<2048){const next=await reader.read();if(next.done)break;prefix+=Buffer.from(next.value).toString('utf8');}await reader.cancel();row.mediaType=prefix.trimStart().startsWith('#EXTM3U')?'HLS':response.headers.get('content-type');if(row.mediaType!=='HLS'&&!/video|octet-stream/.test(row.mediaType||''))throw Error('播放地址没有返回视频');
    if(process.env.FFPROBE_BIN){const args=['-v','error','-rw_timeout','15000000',...(player.header?['-headers',Object.entries(player.header).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n']:[]),'-show_entries','stream=codec_type,codec_name,width,height','-of','json',player.url];const probe=await promisify(execFile)(process.env.FFPROBE_BIN,args,{timeout:45000,maxBuffer:1024*1024});row.streams=JSON.parse(probe.stdout).streams;if(!row.streams?.some(s=>s.codec_type==='video'))throw Error('ffprobe 没有检出视频流');}
    success=true;row.play=true;
   }catch(error){attempts.push(error.message);}
   if(success)break;
  }catch(error){attempts.push(error.message);}}
  if(!success)throw Error(attempts.slice(0,4).join('；')||'没有可验证的播放资源');row.state=row.searchError||row.categoryError?'partial':'verified';
 }catch(error){row.error=String(error.message).replace(/https?:\/\/\S+/g,'[源站地址]').slice(0,250);}
 results.push(row);console.log(JSON.stringify(row));
}
await fs.writeFile(process.env.VERIFICATION_OUTPUT||'verification.local.json',JSON.stringify(results,null,2));if(results.some(row=>row.state!=='verified'))process.exitCode=1;
