'use strict';
const ErmuClient = require('./ErmuClient.js');
const ermu = new ErmuClient();

const appendData = ()=> {
  const store = ermu.getAddress('https://zh.wikipedia.org/wiki/汉语');
  ermu.append('汉语',store,1,(info) => {
    console.log('ermu.append:: info=<',info,'>');
  });  
};


setTimeout(appendData,1000);

const fetchData = ()=> {
  ermu.fetch('汉语',(resource) => {
    //console.log('ermu.fetch4KeyWord:: resource=<',resource,'>');
    onFetchResult(resource);
  });  
}


setTimeout(fetchData,2000);

const onFetchResult = (result) => {
  console.log('dht.onFetchResult:: result=<',result,'>');
}
