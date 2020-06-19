'use strict';
const os = require('os');
const dgram = require("dgram");
const PeerCrypto = require('./peer.crypto.js');
const PeerNetWork = require('./peer.network.js');


class DHT {
  constructor(config,cb) {
    this.config_ = config;
    this.crypto_ = new PeerCrypto(config);
    this.peer_ = new PeerNetWork(config,cb);
    this.info_ = {
      id:this.crypto_.id,
      peer:{
        host:this.peer_.host(),
        port:this.peer_.port()
      }
    };
    this.peer_.onPeerJoint = this.onPeerJoint_.bind(this);
    this.peer_.onRemoteSpread = this.onRemoteSpread_.bind(this);
    this.peer_.onRemoteDelivery = this.onRemoteDelivery_.bind(this);
    this.getInvokers_ = {};
  }
  peerInfo() {
    return this.info_;
  }
  async spread(payload,cb) {
    //console.log('DHT::spread payload=<',payload,'>');
    //console.log('DHT::spread cb=<',cb,'>');
    const address = this.crypto_.calcResourceAddress(payload);
    //console.log('DHT::spread address=<',address,'>');
    const spreadDataMsg = {
      address:address,
      cb:cb,
      from:this.info_.id,
      spread:{
        footprint:[this.info_.id],
        payload:payload
      }
    };
    this.peer_.spread(spreadDataMsg);
    return {address:address,footprint:this.info_.id};
  }
  async delivery(peer,payload) {
    //console.log('DHT::delivery peer=<',peer,'>');
    //console.log('DHT::delivery payload=<',payload,'>');
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
  async onRemoteSpread_(spreadMsg) {
    //console.log('DHT::onRemoteSpread_ this.crypto_.id=<',this.crypto_.id,'>');
    //console.log('DHT::onRemoteSpread_ spreadMsg=<',spreadMsg,'>');
    this.onRemoteSpreed(spreadMsg);
  }
  async onRemoteDelivery_(deliveryMsg) {
    //console.log('DHT::onRemoteDelivery_ this.crypto_.id=<',this.crypto_.id,'>');
    //console.log('DHT::onRemoteDelivery_ deliveryMsg=<',deliveryMsg,'>');
    this.onRemoteDelivery(deliveryMsg);
  }
}
module.exports = DHT;
