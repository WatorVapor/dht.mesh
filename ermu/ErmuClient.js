'use strict';
const DHTClient = require('../api/DHTClient.js');
const CryptoJS = require('crypto-js');
const base32 = require("base32.js");

const bs32Option = { type: "crockford", lc: true };
const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut';

class ErmuClient {
  constructor(serverChannel) {
    this.dht = new DHTClient(daemonUTListenChannel);
    this.dht.peerInfo( (peerInfo)=> {
      console.log('ErmuClient::.constructor:: peerInfo=<',peerInfo,'>');
    });
    const self = this;
    this.dht.subscribe( ( remoteMsg,from ) => {
      self.onRemoteMsg(remoteMsg,from);
    });
  }
  append(keyword,msg,rank) {
    console.log('ErmuClient::append:: keyword=<',keyword,'>');
    console.log('ErmuClient::append:: msg=<',msg,'>');
    console.log('ErmuClient::append:: rank=<',rank,'>');
    const address = this.getAddress(keyword);
    console.log('ErmuClient::append:: address=<',address,'>');
  }
  onRemoteMsg() {
    console.log('ErmuClient::onRemoteMsg:: remoteMsg=<',remoteMsg,'>');
    console.log('ErmuClient::onRemoteMsg:: from=<',from,'>');
  }

  getAddress(content) {
    const contentRipemd = CryptoJS.RIPEMD160(content).toString(CryptoJS.enc.Hex);
    console.log('ErmuClient::onRemoteMsg:: contentRipemd=<',contentRipemd,'>');
    const contentBuffer = Buffer.from(contentRipemd,'hex');
    return base32.encode(contentBuffer,bs32Option);
  }
};

module.exports = ErmuClient;

