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
  async mesh(payload,cb) {
    console.log('DHT::mesh payload=<',payload,'>');
    console.log('DHT::mesh cb=<',cb,'>');
    const address = this.crypto_.calcResourceAddress(payload);
    console.log('DHT::mesh address=<',address,'>');
    const pushDataMsg = {
      address:address,
      cb:cb,
      mesh:{
        footprint:[this.info_.id],
        payload:payload
      }
    };
    this.peer_.publish(pushDataMsg);
    return {address:address,footprint:this.info_.id};
  }
  
  // inside method.
  onPeerJoint_(peer) {
    console.log('DHT::onPeerJoint_ peer=<',peer,'>');
  }
  async onMeshRemote_(address,meshMsg) {
    console.log('DHT::onMeshRemote_ address=<',address,'>');
    console.log('DHT::onMeshRemote_ meshMsg=<',meshMsg,'>');
  }

}
module.exports = DHT;
