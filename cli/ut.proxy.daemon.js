'use strict';
const path = require('path');
//console.log(':: __filename=<',__filename,'>');
const dhtPath = '/storage/dhtfs/cluster/dht_mesh_' + path.parse(__filename).name;
const config = {
  listen:{
    port:19991
  },
  entrance:[
    {
      host:'ermu4.wator.xyz',
      port:19990
    },
    {
      host:'ermu3.wator.xyz',
      port:19990
    }
  ],
  reps: {
    dht:dhtPath,
  },
  trap:false
};
//console.log(':: config=<',config,'>');
const DHT = require('../src/dht.js');
const dht = new DHT(config);
//console.log(':: dht=<',dht,'>');
const peer = dht.peerInfo();
console.log(':: peer=<',peer,'>');

const DHTDaemon = require('../api/DHTDaemon.js');
const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut';
const daemon = new DHTDaemon(dht,daemonUTListenChannel);
