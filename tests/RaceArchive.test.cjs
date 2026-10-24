const assert=require('node:assert/strict'),{RaceArchive,ARCHIVE_KEY}=require('../.test/session/RaceArchive.js'),{readSettings,DEFAULT_SETTINGS}=require('../.test/session/PlayerSettings.js');
(async()=>{
 const data=new Map;let writes=0,fail=false,busy=false;const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');writes++;data.set(k,v);}},locks={request:async(name,opts,cb)=>{assert.equal(name,ARCHIVE_KEY);assert.equal(opts.ifAvailable,true);if(busy)return cb(null);busy=true;try{return await cb({});}finally{busy=false;}}};
 const a=new RaceArchive(storage,locks);assert.equal(await a.acquire(),'persistent');assert.equal(a.read(),null);assert.equal(a.save({model:{credits:500,settled:false},history:[]}),true);assert.equal(writes,1);const old=data.get(ARCHIVE_KEY);
 fail=true;assert.equal(a.save({model:{credits:999}}),false);assert.equal(data.get(ARCHIVE_KEY),old);fail=false;assert.equal(a.read().model.credits,500);
 const b=new RaceArchive(storage,locks);assert.equal(await b.acquire(),'busy');assert.equal(b.save({credits:9}),false);a.dispose();await new Promise(r=>setImmediate(r));assert.equal(await b.acquire(),'persistent');
 data.set(ARCHIVE_KEY,'broken-json');assert.throws(()=>b.read());assert.equal(b.backupUnreadable(),true);assert.equal(data.get(ARCHIVE_KEY+'.unreadable'),'broken-json');b.useTemporary();assert.equal(b.save({credits:4}),true);assert.equal(data.get(ARCHIVE_KEY),'broken-json');b.dispose();
 const temp=new RaceArchive(storage);assert.equal(await temp.acquire(),'temporary');assert.equal(temp.save({}),true);
 let lateCallback;const late=new RaceArchive(storage,{request:async(n,o,callback)=>{lateCallback=callback;}});const pending=late.acquire();late.useTemporary();await lateCallback({});assert.equal(await pending,'temporary');assert.equal(late.mode,'temporary');assert.equal(await late.acquire(),'temporary');late.dispose();
 assert.deepEqual(readSettings({...DEFAULT_SETTINGS}),DEFAULT_SETTINGS);assert.throws(()=>readSettings({...DEFAULT_SETTINGS,master:NaN}));assert.throws(()=>readSettings({...DEFAULT_SETTINGS,chip:'5'}));
 console.log('RaceArchive: one atomic value, failed-write preservation, exclusive writer, release/retry, unreadable backup, temporary mode and settings validation passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
