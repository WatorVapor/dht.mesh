'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');

const bs32Option = { type: "crockford", lc: true };

class ClientKW {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('ClientKW::.constructor:: peerInfo=<',peerInfo,'>');
    });
    const self = this;
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  append(keyword,contentAddress,rank) {
    //console.log('ClientKW::append:: keyword=<',keyword,'>');
    //console.log('ClientKW::append:: contentAddress=<',contentAddress,'>');
    //console.log('ClientKW::append:: rank=<',rank,'>');
    const address = this.getAddress(keyword);
    //console.log('ClientKW::append:: address=<',address,'>');
    const msgObj = {
      ermu: {
        word:keyword,
        store:contentAddress,
        rank:rank
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKW::append:: infoSpread=<',infoSpread,'>');
    });
  }
  fetch(keyword,offset) {
    //console.log('ClientKW::append:: keyword=<',keyword,'>');
    const address = this.getAddress(keyword);
    //console.log('ClientKW::append:: address=<',address,'>');
    const msgObj = {
      ermu: {
        fetch:{
          offset:offset
        }
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKW::append:: infoSpread=<',infoSpread,'>');
    });
  }
  
  onRemoteMsg(msg) {
    //console.log('ClientKW::onRemoteMsg:: msg=<',msg,'>');
     if(msg.spread && msg.spread.payload && msg.spread.payload.ermu) {
       /// empty.
    } else if(msg.delivery && msg.delivery.payload) {
      this.onDeliveryMsg_(msg.delivery.payload);
    } else if(msg.loopback) {
      this.onLoopBackMsg_(msg.loopback);
    } else {
      console.log('ClientKW::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onLoopBackMsg_(loopbak) {
    //console.log('ClientKW::onLoopBackMsg_:: loopbak=<',loopbak,'>');
    if(loopbak.ermuR) {
      this.onErmuReplyMsg_(loopbak.ermuR);
    }
  }
  onDeliveryMsg_(payload) {
    //console.log('ClientKW::onDeliveryMsg_:: payload=<',payload,'>');
    if(payload.ermuR) {
      this.onErmuReplyMsg_(payload.ermuR);
    }
  }
  onErmuReplyMsg_(reply) {
    console.log('ClientKW::onErmuReplyMsg_:: reply=<',reply,'>');
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
};

module.exports = ClientKW;

