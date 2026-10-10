import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegistry} from '../spiders/registry.js';
test('sites initialize independently, retry failed init, and hide credentials from catalogue',async()=>{
 const attempts=new Map();const factories={test:()=>{let key;return {async init(cfg){key=cfg.skey;attempts.set(key,(attempts.get(key)||0)+1);if(key==='bad'&&attempts.get(key)===1)throw Error('temporary failure');},async home(){return key;}}}};
 const {instances,catalogue}=createRegistry({video:{sites:[{key:'bad',type:3,api:'test',ext:{token:'secret'}},{key:'good',type:3,api:'test',searchable:0},{key:'off',type:3,api:'test',enable:false}]}},factories);
 assert.equal(attempts.size,0);assert.equal(instances.has('off'),false);assert.equal(catalogue.video.sites[1].searchable,0);assert.equal(catalogue.video.sites[1].filterable,0);assert.ok(!JSON.stringify(catalogue).includes('secret'));
 await assert.rejects(()=>instances.get('bad').home(),/temporary/);
 assert.deepEqual(await Promise.all([instances.get('good').home(),instances.get('good').home()]),['good','good']);assert.equal(attempts.get('good'),1);
 assert.equal(await instances.get('bad').home(),'bad');assert.equal(attempts.get('bad'),2);
 assert.throws(()=>createRegistry({video:{sites:[{key:'same',type:3,api:'test'},{key:'same',type:3,api:'test'}]}},factories),/重复/);
});
