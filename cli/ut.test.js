'use strict';
const DHTClient = require('../api/DHTClient.js');
const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut';
const dht = new DHTClient(daemonUTListenChannel);
//console.log(':: dht=<',dht,'>');
dht.peerInfo((peerInfo)=>{
  console.log('dht.peerInfo:: peerInfo=<',peerInfo,'>');
});
const meshMsg = ()=> {
  dht.publish('https://en.wikipedia.org/wiki/Kademlia',(info) => {
    console.log('dht.publish:: info=<',info,'>');
  });
  dht.publish('https://en.wikipedia.org/wiki/Distributed_hash_table',(info) => {
    console.log('dht.publish:: info=<',info,'>');
  });
  dht.publish('https://en.wikipedia.org/wiki/Peer-to-peer',(info) => {
    console.log('dht.publish:: info=<',info,'>');
  });
  dht.publish('https://en.wikipedia.org/wiki/Social_network',(info) => {
    console.log('dht.publish:: info=<',info,'>');
  });
  dht.publish('https://en.wikipedia.org/wiki/Axiom',(info) => {
    console.log('dht.publish:: info=<',info,'>');
  });
};
setTimeout(meshMsg,1000);
