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
  const store = kws.getAddress(uri);
  kws.append(keyword,store,rank,(info) => {
    //console.log('kws.append:: info=<',info,'>');
  });  
}

setTimeout(appendData,1000);

const fetchData = ()=> {
  kws.fetch('汉语',(resource) => {
    //console.log('kws.fetch:: resource=<',resource,'>');
    onFetchResult(resource);
  });  
  kws.fetch('汉语',3,(resource) => {
    //console.log('kws.fetch:: resource=<',resource,'>');
    onFetchResult(resource);
  });  
  kws.fetch('汉语',4,(resource) => {
    //console.log('kws.fetch:: resource=<',resource,'>');
    onFetchResult(resource);
  });  
}
setTimeout(fetchData,2000);

const onFetchResult = (result) => {
  console.log('dht.onFetchResult:: result=<',result,'>');
}
