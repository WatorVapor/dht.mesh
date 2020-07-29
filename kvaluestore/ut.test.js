'use strict';
const ClientKV = require('./ClientKV.js');
const kv = new ClientKV();

kv.onData = (data,tag) => {
  console.log('onData:: tag=<',tag,'>');
  console.log('onData:: data=<',data,'>');
  const address = kv.getAddress(data.content);
  console.log('onData:: address=<',address,'>');
}


const storeData = ()=> {
  storeKeyWordUri('汉语','https://zh.wikipedia.org/wiki/汉语',1);
  storeKeyWordUri('汉语','https://www.archi-voice.jp/contents/chn_blog/%E4%B8%AD%E6%96%87%EF%BC%9F%E6%B1%89%E8%AF%AD%EF%BC%9F%E6%99%AE%E9%80%9A%E8%AF%9D%EF%BC%9F/',1);
  storeKeyWordUri('汉语','http://www.hwjyw.com/textbooks/downloads/hanyu/',2);
  storeKeyWordUri('汉语','https://ja.wiktionary.org/wiki/%E6%B1%89%E8%AF%AD',3);
  storeKeyWordUri('汉语','http://www.chinesecio.com/',1);
  storeKeyWordUri('汉语','http://www.shihan.org.cn/',3);
};
const savedAddress = [];
const storeKeyWordUri = (keyword,uri,rank) => {
  const contents = {
    keyword:keyword,
    uri:uri,
    rank:rank
  };
  const address = kv.store(contents).address;
  console.log('storeKeyWordUri:: address=<',address,'>');
  savedAddress.push(address);
}

setTimeout(storeData,1000);

const fetchData = ()=> {
  for( const address of savedAddress) {
    const tag = kv.fetch(address).tag;
    console.log('fetchData:: tag=<',tag,'>');
  }
}
setTimeout(fetchData,2000);

