'use strict';
const DHTClient = require('../api/DHTClient.js');
const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut';
const dht = new DHTClient(daemonUTListenChannel);
//console.log(':: dht=<',dht,'>');
dht.peerInfo((peerInfo)=>{
  console.log('dht.peerInfo:: peerInfo=<',peerInfo,'>');
});
const pushMsg = ()=> {
  dht.push('https://en.wikipedia.org/wiki/Kademlia',(info) => {
    console.log('dht.publish:: info=<',info,'>');
  });
};
setTimeout(pushMsg,1000);
