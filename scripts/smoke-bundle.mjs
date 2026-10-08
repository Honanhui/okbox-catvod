import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const code=await fs.readFile('dist/index.js');assert.equal(crypto.createHash('md5').update(code).digest('hex'),(await fs.readFile('dist/index.js.md5','utf8')).trim());
const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const child=spawn(process.execPath,['dist/index.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',CATVOD_DISABLE_AUTOSTART:'0'},stdio:'pipe'});let errors='';child.stderr.on('data',x=>errors+=x);
try{let response;for(let i=0;i<100;i++){try{response=await fetch(`http://127.0.0.1:${port}/config`);if(response.ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(response?.ok,errors);const catalog=await response.json();assert.equal(catalog.video.sites.length,3);assert.ok(catalog.video.sites.every(site=>!site.ext&&site.api.startsWith('/spider/')));console.log('PASS: standalone bundle starts, serves 3 sites, MD5 matches, catalogue hides protocol keys');}
finally{child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}
