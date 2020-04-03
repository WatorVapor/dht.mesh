'use strict';
const DHTClient = require('../api/DHTClient.js');
const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut';
const dht = new DHTClient(daemonUTListenChannel);
//console.log(':: dht=<',dht,'>');
dht.peerInfo((peerInfo)=>{
  console.log('dht.peerInfo:: peerInfo=<',peerInfo,'>');
});

const putData = ()=> {
  dht.put('https://en.wikipedia.org/wiki/Kademlia',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });
  dht.put('https://en.wikipedia.org/wiki/Computer_network',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
  dht.put('https://en.wikipedia.org/wiki/Wireless_network',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
  dht.put('https://en.wikipedia.org/wiki/Noisy-channel_coding_theorem',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
  dht.put('https://en.wikipedia.org/wiki/Noisy_channel_model',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
  dht.put('https://en.wikipedia.org/wiki/Machine_translation',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
  dht.put('https://en.wikipedia.org/wiki/Word-sense_disambiguation',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
  dht.put('https://en.wikipedia.org/wiki/Web_search_engine',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
  dht.put('https://en.wikipedia.org/wiki/Deep_web',(info) => {
    console.log('dht.put:: info=<',info,'>');
  });  
};

setTimeout(putData,1000);


const getData = ()=> {
  dht.get('sp1b1vyetp8vx7e47gtrjxfr6r6w2gjr',(info) => {
    console.log('dht.get:: info=<',info,'>');
  });
  dht.get('drtabhknvmwczmptry118m12ettvtzxs',(info) => {
    console.log('dht.get:: info=<',info,'>');
  });
  dht.get('r99eqt34051xpjhsxghe4e0131wsxm8w',(info) => {
    console.log('dht.get:: info=<',info,'>');
  });
  dht.get('n2b5zd83vkw076cgg2m8fxycmzfhmsq7',(info) => {
    console.log('dht.get:: info=<',info,'>');
  });
};

setTimeout(getData,5000);

