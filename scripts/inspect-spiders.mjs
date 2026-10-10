import fs from 'node:fs/promises';
import {fetchTvboxConfig} from '../lib/tvbox-config.mjs';
const tasks=[
 ['fty','http://www.xn--sss604efuw.cc/tv'],
 ['wanger','http://tvbox.xn--4kq62z5rby2qupq9ub.top']
];
await fs.mkdir('../.cache/subscriptions',{recursive:true});
for(const [id,url] of tasks){
 const {root}=await fetchTvboxConfig(url);
 const token=String(root.spider||root.jar||'').split(';')[0];
 const response=await fetch(token,{headers:{'user-agent':'okhttp/4.12.0'},signal:AbortSignal.timeout(20000)});
 const body=Buffer.from(await response.arrayBuffer());
 await fs.writeFile('../.cache/subscriptions/'+id+'-spider.bin',body);
 console.log(JSON.stringify({id,configSites:root.sites?.length,spider:token,status:response.status,contentType:response.headers.get('content-type'),bytes:body.length,magic:body.subarray(0,8).toString('hex')},null,2));
}
