'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const { Worker, isMainThread } = require('worker_threads');
const DefaultDaemonListenChannel = 'dht.mesh.api.daemon.listen';
const {Worker} = require('worker_threads');

class DHTDaemonWT {
  constructor(dht,clientChannel) {
    this.dht_ = dht;
    this.worker_ = new Worker('./DHTDaemonInternalWorker.js',{clientChannel:clientChannel});
    const self = this;
    this.worker_.on('message', message => {
      self.onData_(message);
    });
    this.dht_.onRemoteSpreed = (msg)=> {
      self.onRemoteSpread_(msg);
    }
    this.dht_.onRemoteDelivery = (msg)=> {
      self.onRemoteDelivery_(msg);
    }
  }

  async onData_ (data) {
    //console.log('DHTDaemonWT::onData_::data=<',data.toString(),'>');  
    try {
      const jMsg = JSON.parse(data.toString());
      //console.log('DHTDaemonWT::onData_::jMsg=<',jMsg,'>');
      if(jMsg) {
        if(jMsg.peerInfo) {
          await this.onPeerInfo_(jMsg);
        } else if(jMsg.spread) {
          await this.onSpreadData_(jMsg);
        } else if(jMsg.delivery) {
          await this.onDeliveryData_(jMsg);
        } else if(jMsg.loopback) {
          await this.onLoopbackData_(jMsg);
        } else if(jMsg.subscribe) {
          this.onSubscribeData_(jMsg);
        } else if(jMsg.ping) {
          this.onPing_(jMsg);
        } else {
          console.log('DHTDaemonWT::onData_::jMsg=<',jMsg,'>');
        }
      }
    } catch(e) {
      console.log('DHTDaemonWT::onData_::e=<',e,'>');
    }
  };


  async onPeerInfo_ (jMsg){
    const peer = this.dht_.peerInfo();
    console.log('DHTDaemonWT::onPeerInfo_:: peer=<',peer,'>');
    const peerInfoResp = {
      peerInfo:peer,
      cb:jMsg.cb
    };
    this.worker_.postMessage(peerInfoResp);
  };

  async onSpreadData_(jMsg) {
    //console.log('DHTDaemonWT::onSpreadData_::jMsg=<',jMsg,'>');
    this.dht_.spread(jMsg.address,jMsg.spread,jMsg.cb);
    const meshResp = {
      cb:jMsg.cb,
      spread:jMsg.spread
    };
    this.worker_.postMessage(meshResp);
  };

  async onDeliveryData_(jMsg) {
    //console.log('DHTDaemonWT::onDeliveryData_::jMsg=<',jMsg,'>');
    this.dht_.delivery(jMsg.peer,jMsg.delivery,jMsg.cb);
    const meshResp = {
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
