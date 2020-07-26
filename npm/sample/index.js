const KeyWordStore = require('dht.mesh').KW;
const KeyValueStore = require('dht.mesh').KV;
//console.log('::.:: KeyWordStore=<',KeyWordStore,'>');
//console.log('::.:: KeyValueStore=<',KeyValueStore,'>');
const kv = new KeyValueStore();
console.log('::.:: kv=<',kv,'>');
const kw = new KeyWordStore();
console.log('::.:: kw=<',kw,'>');

const storeData = () => {
  const contents = {};
  const address = kv.store(contents);
  console.log('storeData:: address=<',address,'>');
  kw.append('empty',address,1) ;
}

setTimeout(storeData,1000);


