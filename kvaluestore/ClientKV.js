'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');

const bs32Option = { type: "crockford", lc: true };

class ClientKV {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    const self = this;
    this.dht_.OnConnected = ()=> {
      console.log('StorageKW::constructor::OnConnected');
      self.connectDHT_();
    }
    this.dht_.OnDisConnected = ()=> {
      console.log('StorageKW::constructor::OnDisConnected');
    }
  }
  store(content) {
    //console.log('ClientKV::store:: content=<',content,'>');
    const address = this.getAddress(JSON.stringify(content));
    //console.log('ClientKV::store:: address=<',address,'>');
    const tag = this.utils_.random();
    const msgObj = {
      kv: {
        store:content,
      },
      tag:tag      
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKV::store:: infoSpread=<',infoSpread,'>');
    });
    return { address:address,tag:tag};
  }
  fetch(address) {
    //console.log('ClientKV::append:: address=<',address,'>');
    const tag = this.utils_.random();
    const msgObj = {
      kv: {
        fetch:address
      },
      tag:tag
    }
    this.dht_.spread(address,msgObj,(infoSpread)=>{
      console.log('ClientKV::append:: infoSpread=<',infoSpread,'>');
    });
    return { address:address,tag:tag};
  }
  
  onRemoteMsg(msg) {
    //console.log('ClientKV::onRemoteMsg:: msg=<',msg,'>');
     if(msg.spread && msg.spread.payload) {
       /// empty.
    } else if(msg.delivery && msg.delivery.payload) {
      this.onDeliveryMsg_(msg.delivery.payload);
    } else if(msg.loopback) {
      this.onLoopBackMsg_(msg.loopback);
    } else {
      console.log('ClientKV::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onDeliveryMsg_(payload) {
    //console.log('ClientKV::onDeliveryMsg_:: payload=<',payload,'>');
    if(payload.kvR) {
      this.onKvReplyMsg_(payload.kvR,payload.tag);
    }
  }
  onLoopBackMsg_(loopbak) {
    //console.log('ClientKV::onLoopBackMsg_:: loopbak=<',loopbak,'>');
    if(loopbak.kvR) {
      this.onKvReplyMsg_(loopbak.kvR,loopbak.tag);
    }
  }
  onKvReplyMsg_(reply,tag) {
    //console.log('ClientKV::onKvReplyMsg_:: reply=<',reply,'>');
    if(typeof this.onData === 'function') {
      this.onData(reply,tag);
    }
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }

  connectDHT_() {
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('ClientKV::.constructor:: peerInfo=<',peerInfo,'>');
    });
    const self = this;
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }

};

module.exports = ClientKV;

