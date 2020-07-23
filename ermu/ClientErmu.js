'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');

const bs32Option = { type: "crockford", lc: true };

class ClientErmu {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('ClientErmu::.constructor:: peerInfo=<',peerInfo,'>');
    });
    const self = this;
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  append(keyword,contentAddress,rank) {
    //console.log('ClientErmu::append:: keyword=<',keyword,'>');
    //console.log('ClientErmu::append:: contentAddress=<',contentAddress,'>');
    //console.log('ClientErmu::append:: rank=<',rank,'>');
    const address = this.getAddress(keyword);
    //console.log('ClientErmu::append:: address=<',address,'>');
    const msgObj = {
      ermu: {
        word:keyword,
        store:contentAddress,
        rank:rank
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientErmu::append:: infoSpread=<',infoSpread,'>');
    });
  }
  fetch(keyword,offset) {
    //console.log('ClientErmu::append:: keyword=<',keyword,'>');
    const address = this.getAddress(keyword);
    //console.log('ClientErmu::append:: address=<',address,'>');
    const msgObj = {
      ermu: {
        fetch:{
          offset:offset
        }
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientErmu::append:: infoSpread=<',infoSpread,'>');
    });
  }
  
  onRemoteMsg(msg) {
    //console.log('ClientErmu::onRemoteMsg:: msg=<',msg,'>');
     if(msg.spread && msg.spread.payload && msg.spread.payload.ermu) {
       /// empty.
    } else if(msg.loopback) {
      this.onLoopBackMsg_(msg.loopback);
    } else {
      console.log('ErmuDaemon::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onLoopBackMsg_(loopbak) {
    console.log('ClientErmu::onLoopBackMsg_:: loopbak=<',loopbak,'>');
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
};

module.exports = ClientErmu;

