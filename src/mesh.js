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
    this.peer_.onMeshRemote = this.onMeshRemote_.bind(this);
    this.getInvokers_ = {};
  }
  peerInfo() {
    return this.info_;
  }
  async push(data,cb) {
    console.log('DHT::push data=<',data,'>');
    console.log('DHT::push cb=<',cb,'>');
    const address = this.crypto_.calcResourceAddress(data);
    console.log('DHT::push address=<',address,'>');
    const pushDataMsg = {
      address:address,
      cb:cb,
      push:{
        seed:this.info_.id,
        data:data
      }
    };
    this.peer_.publish(pushDataMsg);
    return {address:address,seed:this.info_.id};
  }
  
  // inside method.
  onPeerJoint_(peer) {
    console.log('DHT::onPeerJoint_ peer=<',peer,'>');
  }
  async onMeshRemote_(address,resource) {
    console.log('DHT::onMeshRemote_ address=<',address,'>');
    console.log('DHT::onMeshRemote_ resource=<',resource,'>');
  }

}
module.exports = DHT;
