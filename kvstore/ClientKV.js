'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');

const bs32Option = { type: "crockford", lc: true };

class ClientKV {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('ClientKV::.constructor:: peerInfo=<',peerInfo,'>');
    });
    const self = this;
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  store(content) {
    //console.log('ClientKV::store:: content=<',content,'>');
    const address = this.getAddress(content);
    //console.log('ClientKV::store:: address=<',address,'>');
    const msgObj = {
      indexer: {
        store:content,
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKV::store:: infoSpread=<',infoSpread,'>');
    });
    return address;
  }
  fetch(address) {
    //console.log('ClientKV::append:: keyword=<',keyword,'>');
    const address = this.getAddress(keyword);
    //console.log('ClientKV::append:: address=<',address,'>');
    const msgObj = {
      indexer: {
        fetch:address
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKV::append:: infoSpread=<',infoSpread,'>');
    });
  }
  
  onRemoteMsg(msg) {
    //console.log('ClientKV::onRemoteMsg:: msg=<',msg,'>');
     if(msg.spread && msg.spread.payload && msg.spread.payload.ermu) {
       /// empty.
    } else if(msg.delivery && msg.delivery.payload) {
      this.onDeliveryMsg_(msg.delivery.payload);
    } else if(msg.loopback) {
      this.onLoopBackMsg_(msg.loopback);
    } else {
      console.log('ClientKV::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onLoopBackMsg_(loopbak) {
    //console.log('ClientKV::onLoopBackMsg_:: loopbak=<',loopbak,'>');
    if(loopbak.ermuR) {
      this.onErmuReplyMsg_(loopbak.ermuR);
    }
  }
  onDeliveryMsg_(payload) {
    //console.log('ClientKV::onDeliveryMsg_:: payload=<',payload,'>');
    if(payload.ermuR) {
      this.onErmuReplyMsg_(payload.ermuR);
    }
  }
  onErmuReplyMsg_(reply) {
    console.log('ClientKV::onErmuReplyMsg_:: reply=<',reply,'>');
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
};

module.exports = ClientKV;

