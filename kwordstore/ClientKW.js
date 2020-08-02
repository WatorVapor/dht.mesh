'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');

const bs32Option = { type: "crockford", lc: true };

class ClientKW {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    const self = this;
    this.dht_.OnConnected = ()=> {
      console.log('ClientKW::constructor::OnConnected');
      self.connectDHT_();
    }
    this.dht_.OnDisConnected = ()=> {
      console.log('ClientKW::constructor::OnDisConnected');
    }
 }
  append(keyword,contentAddress,rank) {
    //console.log('ClientKW::append:: keyword=<',keyword,'>');
    //console.log('ClientKW::append:: contentAddress=<',contentAddress,'>');
    //console.log('ClientKW::append:: rank=<',rank,'>');
    const address = this.getAddress(keyword);
    //console.log('ClientKW::append:: address=<',address,'>');
    const tag = this.utils_.random();
    const msgObj = {
      kw: {
        word:keyword,
        store:contentAddress,
        rank:rank
      },
      tag:tag
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKW::append:: infoSpread=<',infoSpread,'>');
    });
    return tag;
  }
  fetch(keyword,offset) {
    //console.log('ClientKW::append:: keyword=<',keyword,'>');
    const address = this.getAddress(keyword);
    //console.log('ClientKW::append:: address=<',address,'>');
    const tag = this.utils_.random();
    const msgObj = {
      kw: {
        fetch:{
          offset:offset
        },
        tag:tag
      }
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKW::append:: infoSpread=<',infoSpread,'>');
    });
    return tag;
  }
  
  onRemoteMsg(msg) {
    //console.log('ClientKW::onRemoteMsg:: msg=<',msg,'>');
     if(msg.spread && msg.spread.payload) {
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
    if(loopbak.kwR) {
      this.onReplyMsg_(loopbak.kwR,loopbak.tag);
    }
  }
  onDeliveryMsg_(payload) {
    //console.log('ClientKW::onDeliveryMsg_:: payload=<',payload,'>');
    if(payload.kwR) {
      this.onReplyMsg_(payload.kwR,payload.tag);
    }
  }
  onReplyMsg_(reply,tag) {
    //console.log('ClientKW::onReplyMsg_:: reply=<',reply,'>');
    if(typeof this.onData === 'function') {
      this.onData(reply,tag);
    }
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }


  connectDHT_() {
   this.dht_.peerInfo( (peerInfo)=> {
      console.log('ClientKW::.constructor:: peerInfo=<',peerInfo,'>');
    });
    const self = this;
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
};

module.exports = ClientKW;

