'use strict';
const path = require('path');
//console.log(':: __filename=<',__filename,'>');
const dhtPath = '/storage/dhtfs/cluster/dht_leveldb_' + path.parse(__filename).name + '/peerstore';
const dataPath = '/storage/dhtfs/cluster/dht_leveldb_' + path.parse(__filename).name + '/datastore';
const config = {
  listen:{
    port:9990
  },
  entrance:[
    {
      host:'ermu4.wator.xyz',
      port:9990
    },
    {
      host:'ermu3.wator.xyz',
      port:9990
    }
  ],
  reps: {
    dht:dhtPath,
    data:dataPath
  },
  storage:true
};
//console.log(':: config=<',config,'>');
const DHT = require('../src/dht.js');
const dht = new DHT(config);
//console.log(':: dht=<',dht,'>');
const peer = dht.peerInfo();
console.log(':: peer=<',peer,'>');

const DHTDaemon = require('../api/DHTDaemon.js');
const serverUTListenChannel = 'dht.level.api.server.listen';
const daemon = new DHTDaemon(dht,serverUTListenChannel);
