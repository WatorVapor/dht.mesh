'use strict';
//const bs58 = require('bs58');
const base32 = require("base32.js");
const bitwise = require("bitwise");
const bigInt = require("big-integer");

class PeerRoute {
  constructor(crypto) {
    //console.log('PeerRoute::constructor peers=<',peers,'>');
    this.crypto_ = crypto;
    this.id_ = this.crypto_.id;
    this.buckets_ = {};
    this.respBuckets_ = {};
  }
  addPeer(peer) {
    //console.log('PeerRoute::addPeer peer=<',peer,'>');
    //console.log('PeerRoute::addPeer this.id_=<',this.id_,'>');
    const distance = this.calcDistance_(peer,this.id_);
    //console.log('PeerRoute::addPeer distance=<',distance,'>');
    if(!this.buckets_[distance]) {
      this.buckets_[distance] = {};
    }
    this.buckets_[distance][peer] = {};
    if(!this.respBuckets_[distance]) {
      this.respBuckets_[distance] = {};
    }
    this.respBuckets_[distance][peer] = {};
    console.log('PeerRoute::addPeer this.buckets_=<',this.buckets_,'>');
  }

  updatePeer(peer,ttr) {
    //console.log('PeerRoute::updatePeer peer=<',peer,'>');
    //console.log('PeerRoute::updatePeer ttr=<',ttr,'>');
    //console.log('PeerRoute::updatePeer this.id_=<',this.id_,'>');
    const distance = this.calcDistance_(peer,this.id_);
    //console.log('PeerRoute::updatePeer distance=<',distance,'>');
    if(!this.buckets_[distance]) {
      this.buckets_[distance] = {};
    }
    this.buckets_[distance][peer] = ttr;
    //console.log('PeerRoute::updatePeer this.buckets_=<',this.buckets_,'>');
    if(!this.respBuckets_[distance]) {
      this.respBuckets_[distance] = {};
    }
    this.respBuckets_[distance][peer] = ttr;
    //console.log('PeerRoute::updatePeer this.buckets_=<',this.buckets_,'>');      
    //console.log('PeerRoute::updatePeer this.respBuckets_=<',this.respBuckets_,'>');      
  }

  removePeer(peer) {
    console.log('PeerRoute::removePeer peer=<',peer,'>');
    for(const bucketIndex in this.buckets_) {
      const bucket = this.buckets_[bucketIndex];
      if(bucket[peer]) {
        delete this.buckets_[bucketIndex][peer];
      }
    }
    console.log('PeerRoute::removePeer this.buckets_=<',this.buckets_,'>');
    for(const bucketIndex in this.respBuckets_) {
      const bucket = this.respBuckets_[bucketIndex];
      if(bucket[peer]) {
        delete this.respBuckets_[bucketIndex][peer];
      }
    }
    console.log('PeerRoute::removePeer this.buckets_=<',this.buckets_,'>');
  }
  
  
  calcContent(address) {
    //console.log('PeerRoute::calcContent address=<',address,'>');
    //console.log('PeerRoute::calcContent this.id_=<',this.id_,'>');
    let distanceMin = bigInt('ffffffffffffffffffffffffffffffffffffffff',16);
    let peerMin = false;
    let distanceMax = bigInt('0000000000000000000000000000000000000000',16);
    let peerMax = false;
    for(const bucketIndex in this.buckets_) {
      //console.log('PeerRoute::calcContent bucketIndex=<',bucketIndex,'>');
      let bucket = this.buckets_[bucketIndex];
      for(const peerId in bucket) {
        //console.log('PeerRoute::calcContent peerId=<',peerId,'>');
        const distance = this.calcDistance_(address,peerId);
        //console.log('PeerRoute::calcContent distance=<',distance,'>');
        if(distanceMin.gt(distance)) {
          distanceMin = distance;
          peerMin = peerId;
        }
        if(distanceMax.lt(distance)) {
          distanceMax = distance;
          peerMax = peerId;
        }
      }
    }
    //console.log('PeerRoute::calcContent distanceMin=<',distanceMin,'>');
    //console.log('PeerRoute::calcContent peerMin=<',peerMin,'>');
    //console.log('PeerRoute::calcContent distanceMax=<',distanceMax,'>');
    //console.log('PeerRoute::calcContent peerMax=<',peerMax,'>');
    return {min:peerMin,max:peerMax};
  }

  calcPeer(peerAddress) {
    //console.log('PeerRoute::calcPeer peerAddress=<',peerAddress,'>');
    //console.log('PeerRoute::calcPeer this.id_=<',this.id_,'>');
    let distanceMin = 161;
    let peerMin = false;
    let distanceMax = 0;
    let peerMax = false;
    for(const bucketIndex in this.respBuckets_) {
      //console.log('PeerRoute::calcPeer bucketIndex=<',bucketIndex,'>');
      let bucket = this.respBuckets_[bucketIndex];
      for(const peerId in bucket) {
        //console.log('PeerRoute::calcPeer peerId=<',peerId,'>');
        const distance = this.calcDistance_(peerAddress,peerId);
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
  
  calcDistance_(address,peer) {
    //console.log('PeerRoute::calcDistance_ address=<',address,'>');
    //console.log('PeerRoute::calcDistance_ peer=<',peer,'>');
    const addressBuf = base32.decode(address);
    const peerBuf = base32.decode(peer);
    const distanceBuf = bitwise.buffer.xor(addressBuf,peerBuf,false);
    //console.log('PeerRoute::calcDistance_ distanceBuf=<',distanceBuf,'>');
    return bigInt(distanceBuf.toString('hex'),16);
    
    /*
    const distanceBit = bitwise.buffer.read(distanceBuf);
    //console.log('PeerRoute::calcDistance_ distanceBit=<',distanceBit,'>');
    
    let distanceXor = 0;
    for(const bit of distanceBit) {
      if(bit) {
        distanceXor++;
      }
    }
    //console.log('PeerRoute::calcDistance_ distanceXor=<',distanceXor,'>');
    return distanceXor;
    */
  }
}

module.exports = PeerRoute;
