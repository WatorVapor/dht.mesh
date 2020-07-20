'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');

const bs32Option = { type: "crockford", lc: true };

class ErmuClient {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('ErmuClient::.constructor:: peerInfo=<',peerInfo,'>');
    });
  }
  append(keyword,contentAddress,rank) {
    //console.log('ErmuClient::append:: keyword=<',keyword,'>');
    //console.log('ErmuClient::append:: contentAddress=<',contentAddress,'>');
    //console.log('ErmuClient::append:: rank=<',rank,'>');
    const address = this.getAddress(keyword);
    //console.log('ErmuClient::append:: address=<',address,'>');
    const msgObj = {
      ermu: {
        word:keyword,
        store:contentAddress,
        rank:rank
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ErmuClient::append:: infoSpread=<',infoSpread,'>');
    });
  }
  fetch(keyword,offset) {
    //console.log('ErmuClient::append:: keyword=<',keyword,'>');
    const address = this.getAddress(keyword);
    //console.log('ErmuClient::append:: address=<',address,'>');
    const msgObj = {
      ermu: {
        fetch:{
          offset:offset
        }
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ErmuClient::append:: infoSpread=<',infoSpread,'>');
    });
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
};

module.exports = ErmuClient;

