'use strict';
const os = require('os');
const dgram = require("dgram");
const PeerCrypto = require('./peer.crypto.js');
const PeerNetWork = require('./peer.network.js');


class DHT {
  constructor(config) {
    this.config_ = config;
    this.crypto_ = new PeerCrypto(config);
    this.peer_ = new PeerNetWork(config);
    this.info_ = {
      id:this.crypto_.id,
      peer:{
        host:this.peer_.host(),
        port:this.peer_.port()
      }
    };
    this.peer_.onPeerJoint = this.onPeerJoint_.bind(this);
    this.peer_.onRemotePublish = this.onRemotePublish_.bind(this);
    this.peer_.onRemoteDelivery = this.onRemoteDelivery_.bind(this);
    this.getInvokers_ = {};
  }
  peerInfo() {
    return this.info_;
  }
  async publish(payload,cb) {
    console.log('DHT::publish payload=<',payload,'>');
    console.log('DHT::publish cb=<',cb,'>');
    const address = this.crypto_.calcResourceAddress(payload);
    console.log('DHT::publish address=<',address,'>');
    const publishDataMsg = {
      address:address,
      cb:cb,
      from:this.info_.id,
      publish:{
        footprint:[this.info_.id],
        payload:payload
      }
    };
    this.peer_.publish(publishDataMsg);
    return {address:address,footprint:this.info_.id};
  }
  async delivery(peer,payload) {
    console.log('DHT::delivery peer=<',peer,'>');
    console.log('DHT::delivery payload=<',payload,'>');
    const deliveryDataMsg = {
      address:peer,
      delivery:{
        footprint:[this.info_.id],
        payload:payload
      }
    };
    this.peer_.delivery(deliveryDataMsg);
    return {address:peer,footprint:this.info_.id};
  }

  
  // inside method.
  onPeerJoint_(peer) {
    console.log('DHT::onPeerJoint_ peer=<',peer,'>');
  }
  async onRemotePublish_(publishMsg) {
    console.log('DHT::onRemotePublish_ publishMsg=<',publishMsg,'>');
  }
  async onRemoteDelivery_(deliveryMsg) {
    console.log('DHT::onRemoteDelivery_ deliveryMsg=<',deliveryMsg,'>');
  }
}
module.exports = DHT;
