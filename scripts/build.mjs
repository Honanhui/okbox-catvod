import {build} from 'esbuild';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
await fs.mkdir('dist',{recursive:true});
await fs.writeFile('dist/package.json',JSON.stringify({type:'commonjs'})+'\n');
await build({entryPoints:['index.js'],bundle:true,platform:'node',target:'node22',format:'cjs',write:false}).then(async result=>{
 const text='/* OKBOX CatVodOpen 0.1 | Node.js 22+ */\n'+result.outputFiles[0].text;
 await fs.writeFile('dist/index.js',text);await fs.writeFile('dist/index.js.md5',crypto.createHash('md5').update(text).digest('hex'));
 console.log('Generated dist/index.js and dist/index.js.md5');
});
