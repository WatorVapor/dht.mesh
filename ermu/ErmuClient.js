'use strict';
const DHTClient = require('../api/DHTClient.js');
const CryptoJS = require('crypto-js');
const base32 = require("base32.js");

const bs32Option = { type: "crockford", lc: true };
const daemonUTListenChannel = 'dht.mesh.api.daemon.listen.ut';

class ErmuClient {
  constructor(serverChannel) {
    this.dht_ = new DHTClient(daemonUTListenChannel);
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('ErmuClient::.constructor:: peerInfo=<',peerInfo,'>');
    });
  }
  append(keyword,msg,rank) {
    //console.log('ErmuClient::append:: keyword=<',keyword,'>');
    //console.log('ErmuClient::append:: msg=<',msg,'>');
    //console.log('ErmuClient::append:: rank=<',rank,'>');
    const address = this.getAddress(keyword);
    //console.log('ErmuClient::append:: address=<',address,'>');
    const msgObj = {
      ermu: {
        word:keyword,
        msg:msg,
        rank:rank
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ErmuClient::append:: infoSpread=<',infoSpread,'>');
    });
  }

  getAddress(content) {
    const contentRipemd = CryptoJS.RIPEMD160(content).toString(CryptoJS.enc.Hex);
    console.log('ErmuClient::getAddress:: contentRipemd=<',contentRipemd,'>');
    const contentBuffer = Buffer.from(contentRipemd,'hex');
    return base32.encode(contentBuffer,bs32Option);
  }
};

module.exports = ErmuClient;

