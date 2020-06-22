'use strict';
/*
const base32 = require("base32.js");
const bitwise = require("bitwise");
*/
const bigInt = require("big-integer");


class PeerRoute {
  constructor(crypto,bucket) {
    //console.log('PeerRoute::constructor peers=<',peers,'>');
    this.crypto_ = crypto;
    this.bucket_ = bucket;
    this.id_ = this.crypto_.id;
    this.trapBuckets_ = {};
    this.fullBuckets_ = {};
  }
  
  
  calcContent(address) {
    //console.log('PeerRoute::calcContent address=<',address,'>');
    //console.log('PeerRoute::calcContent this.id_=<',this.id_,'>');
    let distanceMin = bigInt('ffffffffffffffffffffffffffffffffffffffff',16);
    let peerMin = false;
    let distanceMax = bigInt('0000000000000000000000000000000000000000',16);
    let peerMax = false;
    for(const bucketIndex in this.bucket_.trapBuckets_) {
      //console.log('PeerRoute::calcContent bucketIndex=<',bucketIndex,'>');
      let bucket = this.bucket_.trapBuckets_[bucketIndex];
      for(const peerId in bucket) {
        //console.log('PeerRoute::calcContent peerId=<',peerId,'>');
        const distance = this.bucket_.calcDistance_(address,peerId);
        //console.log('PeerRoute::calcContent distance=<',distance,'>');
        if(distanceMin.gt(distance)) {
          distanceMin = distance;
          peerMin = peerId;
        }
        if(distanceMax.lt(distance)) {
          distanceMax = distance;
          peerMax = peerId;
        }
        //console.log('PeerRoute::calcContent distanceMin=<',distanceMin,'>');
        //console.log('PeerRoute::calcContent distanceMax=<',distanceMax,'>');
        //console.log('PeerRoute::calcContent peerMin=<',peerMin,'>');
        //console.log('PeerRoute::calcContent peerMax=<',peerMax,'>');
      }
    }
    //console.log('PeerRoute::calcContent distanceMin=<',distanceMin,'>');
    //console.log('PeerRoute::calcContent peerMin=<',peerMin,'>');
    //console.log('PeerRoute::calcContent distanceMax=<',distanceMax,'>');
    //console.log('PeerRoute::calcContent peerMax=<',peerMax,'>');
    console.log('PeerRoute::calcContent this.bucket_.trapBuckets_=<',this.bucket_.trapBuckets_,'>');
    return {min:peerMin,max:peerMax};
  }

  calcPeer(peerAddress) {
    //console.log('PeerRoute::calcPeer peerAddress=<',peerAddress,'>');
    //console.log('PeerRoute::calcPeer this.id_=<',this.id_,'>');
    let distanceMin = bigInt('ffffffffffffffffffffffffffffffffffffffff',16);
    let peerMin = false;
    let distanceMax = bigInt('0000000000000000000000000000000000000000',16);
    let peerMax = false;
    for(const bucketIndex in this.bucket_.fullBuckets_) {
      //console.log('PeerRoute::calcPeer bucketIndex=<',bucketIndex,'>');
      let bucket = this.bucket_.fullBuckets_[bucketIndex];
      for(const peerId in bucket) {
        //console.log('PeerRoute::calcPeer peerId=<',peerId,'>');
        const distance = this.bucket_.calcDistance_(peerAddress,peerId);
        //console.log('PeerRoute::calcPeer distance=<',distance,'>');
        if(distanceMin > distance) {
          distanceMin = distance;
          peerMin = peerId;
        }
        if(distanceMax < distance) {
          distanceMax = distance;
          peerMax = peerId;
        }
      }
    }
    //console.log('PeerRoute::calcPeer distanceMin=<',distanceMin,'>');
    //console.log('PeerRoute::calcPeer peerMin=<',peerMin,'>');
    //console.log('PeerRoute::calcPeer distanceMax=<',distanceMax,'>');
    //console.log('PeerRoute::calcPeer peerMax=<',peerMax,'>');
    return {min:peerMin,max:peerMax};
  }
}

module.exports = PeerRoute;
