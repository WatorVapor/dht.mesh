'use strict';
const DHTClient = require('../api/DHTClient.js');
const CryptoJS = require('crypto-js');
const base32 = require("base32.js");

const bs32Option = { type: "crockford", lc: true };
const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut';

class ErmuDaemon {
  constructor(serverChannel) {
    this.dht = new DHTClient(daemonUTListenChannel);
    this.dht.peerInfo( (peerInfo)=> {
      console.log('ErmuDaemon::.constructor:: peerInfo=<',peerInfo,'>');
    });
    const self = this;
    this.dht.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  onRemoteMsg(msg) {
    console.log('ErmuDaemon::onRemoteMsg:: msg=<',msg,'>');
  }
};

const daemon = new ErmuDaemon();
