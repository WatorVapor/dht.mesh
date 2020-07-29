'use strict';
const KeyWordStore = require('./ClientKW.js');
const kws = new KeyWordStore();

const appendData = ()=> {
  storeKeyWordUri('汉语','https://zh.wikipedia.org/wiki/汉语',1);
  storeKeyWordUri('汉语','https://www.archi-voice.jp/contents/chn_blog/%E4%B8%AD%E6%96%87%EF%BC%9F%E6%B1%89%E8%AF%AD%EF%BC%9F%E6%99%AE%E9%80%9A%E8%AF%9D%EF%BC%9F/',1);
  storeKeyWordUri('汉语','http://www.hwjyw.com/textbooks/downloads/hanyu/',2);
  storeKeyWordUri('汉语','https://ja.wiktionary.org/wiki/%E6%B1%89%E8%AF%AD',3);
  storeKeyWordUri('汉语','http://www.chinesecio.com/',1);
  storeKeyWordUri('汉语','http://www.shihan.org.cn/',3);
};

const storeKeyWordUri = (keyword,uri,rank) => {
  const storeAddress = kws.getAddress(uri);
  const tag = kws.append(keyword,storeAddress,rank); 
  console.log('storeKeyWordUri:: tag=<',tag,'>');  
}

setTimeout(appendData,1000);

const fetchData = ()=> {
  const tag1 = kws.fetch('汉语');
  console.log('storeKeyWordUri:: tag1=<',tag1,'>');  
  const tag2 = kws.fetch('汉语',3);  
  console.log('storeKeyWordUri:: tag2=<',tag2,'>');  
  const tag3 = kws.fetch('汉语',4);  
  console.log('storeKeyWordUri:: tag3=<',tag3,'>');  
}
setTimeout(fetchData,2000);



kws.onData = (data,tag)=> {
  console.log('kws.onData:: data=<',data,'>');
  console.log('kws.onData:: tag=<',tag,'>');
}
