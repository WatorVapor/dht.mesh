'use strict';
const path = require('path');
const crypto = require('crypto');
const DHT = require('../src/dht.js');
const DHTDaemon = require('../api/DHTDaemon.js');
const listenPortRange = [19991,20000];
//console.log(':: __filename=<',__filename,'>');


let peer = false;
let daemon = false;
const tryNewDHT = async () => {
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
    console.log(':: config=<',config,'>');
    const promise = new Promise((resolve, reject) => {
      const dht = new DHT(config,(err)=> {
        console.log(':: err=<',err,'>');
        if(err) {
          reject(err);
        } else {
          resolve(dht);
        }
      });
      //console.log(':: dht=<',dht,'>');
      peer = dht.peerInfo();
      console.log(':: peer=<',peer,'>');
      const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut.' + RandomPath;
      daemon = new DHTDaemon(dht,daemonUTListenChannel);
    });
    try {
      const dhtP = await promise;
      console.log(':: dhtP=<',dhtP,'>');
      break;
    } catch( err ) {
      console.log(':: err=<',err,'>');
    }
  }
}

tryNewDHT();
