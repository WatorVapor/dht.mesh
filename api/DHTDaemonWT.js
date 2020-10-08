'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const {Worker} = require('worker_threads');

class DHTDaemonWT {
  constructor(dht,clientChannel) {
    this.dht_ = dht;
    this.worker_ = new Worker(__dirname +'/DHTDaemonInternalWorker.js',{workerData:clientChannel});
    const self = this;
    this.worker_.on('message', message => {
      self.onWorkerClientMsg_(message);
    });
    this.dht_.onRemoteSpreed = (msg)=> {
      self.onRemoteSpread_(msg);
    }
    this.dht_.onRemoteDelivery = (msg)=> {
      self.onRemoteDelivery_(msg);
    }
  }

  async onWorkerClientMsg_ (jMsg) {
    console.log('DHTDaemonWT::onWorkerClientMsg_::jMsg=<',jMsg,'>');  
    try {
      if(jMsg) {
        if(jMsg.peerInfo) {
          await this.onPeerInfo_(jMsg);
        } else if(jMsg.spread) {
          await this.onSpreadData_(jMsg);
        } else if(jMsg.delivery) {
          await this.onDeliveryData_(jMsg);
        } else if(jMsg.loopback) {
          await this.onLoopbackData_(jMsg);
        } else {
          console.log('DHTDaemonWT::onWorkerClientMsg_::jMsg=<',jMsg,'>');
        }
      }
    } catch(e) {
      console.log('DHTDaemonWT::onWorkerClientMsg_::e=<',e,'>');
    }
  };


  async onPeerInfo_ (jMsg){
    const peer = this.dht_.peerInfo();
    console.log('DHTDaemonWT::onPeerInfo_:: peer=<',peer,'>');
    const peerInfoResp = {
      channel:jMsg.channel,
      peerInfo:peer,
      cb:jMsg.cb
    };
    this.worker_.postMessage(peerInfoResp);
  };

  async onSpreadData_(jMsg) {
    //console.log('DHTDaemonWT::onSpreadData_::jMsg=<',jMsg,'>');
    this.dht_.spread(jMsg.address,jMsg.spread,jMsg.cb);
    const meshResp = {
      channel:jMsg.channel,
      cb:jMsg.cb,
      spread:jMsg.spread
    };
    this.worker_.postMessage(meshResp);
  };

  async onDeliveryData_(jMsg) {
    //console.log('DHTDaemonWT::onDeliveryData_::jMsg=<',jMsg,'>');
    this.dht_.delivery(jMsg.peer,jMsg.delivery,jMsg.cb);
    const meshResp = {
      channel:jMsg.channel,
      cb:jMsg.cb,
      delivery:jMsg.delivery
    };
    this.worker_.postMessage(meshResp);
  };

  async onLoopbackData_(jMsg) {
    //console.log('DHTDaemonWT::onLoopbackData_::jMsg=<',jMsg,'>');
    this.worker_.postMessage(jMsg);
  };

  onRemoteSpread_(spreadMsg) {
    //console.log('DHTDaemonWT::onRemoteSpread_ spreadMsg=<',spreadMsg,'>');
    const meshResp = {
      remoteSpread:spreadMsg
    };
    this.worker_.postMessage(meshResp);
  }
  onRemoteDelivery_(deliveryMsg) {
    //console.log('DHTDaemonWT::onRemoteDelivery_ deliveryMsg=<',deliveryMsg,'>');
    const meshResp = {
      remoteDelivery:deliveryMsg
    };
    this.worker_.postMessage(meshResp);
  }

};

module.exports = DHTDaemonWT;
