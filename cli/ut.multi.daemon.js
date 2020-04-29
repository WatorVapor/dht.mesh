'use strict';
const path = require('path');
const crypto = require('crypto');
const DHT = require('../src/dht.js');
const DHTDaemon = require('../api/DHTDaemon.js');
const listenPortRange = [19991,20000];
//console.log(':: __filename=<',__filename,'>');
let peer = false;
let daemon = false;
for(let port = listenPortRange[0];port <= listenPortRange[1];port++) {
  const RandomPath = crypto.randomBytes(32).toString('hex');
  const dhtPath = '/storage/dhtfs/cluster/dht_mesh_multi_' + RandomPath + '_' + path.parse(__filename).name;
  const config = {
    listen:{
      port:port
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
    trap:true
  };
  try {
    //console.log(':: config=<',config,'>');
    const dht = new DHT(config);
    //console.log(':: dht=<',dht,'>');
    peer = dht.peerInfo();
    console.log(':: peer=<',peer,'>');
    const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut.' + RandomPath;
    daemon = new DHTDaemon(dht,daemonUTListenChannel);
    break;
  } catch (err) {
    console.log(':: err=<',err,'>');
  }
}
