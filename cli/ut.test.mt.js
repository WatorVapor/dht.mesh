'use strict';
const DHTClient = require('../api/DHTClient.js');
const daemonUTListenChannel = 'mt.dht.mesh.api.daemon.listen.ut';
const dht = new DHTClient(daemonUTListenChannel);
//console.log(':: dht=<',dht,'>');
dht.peerInfo((peerInfo)=>{
  console.log('dht.peerInfo:: peerInfo=<',peerInfo,'>');
});
const meshMsg = ()=> {
  
   
  dht.spreadContent('https://en.wikipedia.org/wiki/Kademlia',(info) => {
    console.log('dht.spreadContent:: info=<',info,'>');
  });
  

  dht.spreadContent('https://en.wikipedia.org/wiki/Distributed_hash_table',(info) => {
    console.log('dht.spreadContent:: info=<',info,'>');
  });
  
  dht.spreadContent('https://en.wikipedia.org/wiki/Peer-to-peer',(info) => {
    console.log('dht.spreadContent:: info=<',info,'>');
  });
  
  dht.spreadContent('https://en.wikipedia.org/wiki/Social_network',(info) => {
    console.log('dht.spreadContent:: info=<',info,'>');
  });
  
  
  dht.spreadContent('https://en.wikipedia.org/wiki/Axiom',(info) => {
    console.log('dht.spreadContent:: info=<',info,'>');
  });
  
  
};
dht.subscribe((remoteMsg,from) => {
  console.log('dht.subscribe:: remoteMsg=<',remoteMsg,'>');
  console.log('dht.subscribe:: from=<',from,'>');
});
dht.OnConnected(() => {
  console.log('dht.OnConnected:: ');
});
setTimeout(meshMsg,1000);

