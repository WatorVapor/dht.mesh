'use strict';
const base32 = require("base32.js");
const bitwise = require("bitwise");
const bigInt = require("big-integer");
const iConstBucketMax = 4;

class PeerBucket {
  constructor(crypto) {
    //console.log('PeerBucket::constructor crypto=<',crypto,'>');
    this.crypto_ = crypto;
    this.id_ = this.crypto_.id;
    this.trapBuckets_ = {};
    this.fullBuckets_ = {};
    this.peersFlat_ = {};
  }
  addPeer(peer,rinfo,trap) {
    //console.log('PeerBucket::addPeer peer=<',peer,'>');
    //console.log('PeerBucket::addPeer rinfo=<',rinfo,'>');
    //console.log('PeerBucket::addPeer trap=<',trap,'>');
    const distanceIndex = this.calcDistanceBit_(peer,this.id_);
    //console.log('PeerBucket::addPeer distanceIndex=<',distanceIndex,'>');
    if(trap) {
      if(!this.trapBuckets_[distanceIndex]) {
        this.trapBuckets_[distanceIndex] = {};
      }
      if(!this.trapBuckets_[distanceIndex][peer]) {
        this.trapBuckets_[distanceIndex][peer] = {};
      }
      this.trapBuckets_[distanceIndex][peer].address = rinfo.address;
      this.trapBuckets_[distanceIndex][peer].port = rinfo.port;
    }
    //console.log('PeerBucket::addPeer this.trapBuckets_=<',this.trapBuckets_,'>');
    if(!this.fullBuckets_[distanceIndex]) {
      this.fullBuckets_[distanceIndex] = {};
    }
    if(!this.fullBuckets_[distanceIndex][peer]) {
      this.fullBuckets_[distanceIndex][peer] = {};
    }
    this.fullBuckets_[distanceIndex][peer].address = rinfo.address;
    this.fullBuckets_[distanceIndex][peer].port = rinfo.port;
    //console.log('PeerBucket::addPeer this.fullBuckets_=<',this.fullBuckets_,'>');
    this.peersFlat_[peer] = rinfo;
  }
  fetchPeerInfo() {
    return this.peersFlat_;
  }

  updatePeer(peer,ttr) {
    if(peer === this.id_) {
      return;
    }
    //console.log('PeerBucket::updatePeer peer=<',peer,'>');
    //console.log('PeerBucket::updatePeer ttr=<',ttr,'>');
    //console.log('PeerBucket::updatePeer this.id_=<',this.id_,'>');
    const distanceIndex = this.calcDistanceBit_(peer,this.id_);
    //console.log('PeerBucket::updatePeer distanceIndex=<',distanceIndex,'>');
    if(!this.trapBuckets_[distanceIndex]) {
      this.trapBuckets_[distanceIndex] = {};
    }
    if(this.trapBuckets_[distanceIndex] && this.trapBuckets_[distanceIndex][peer]) {
      this.trapBuckets_[distanceIndex][peer].ttr = ttr;
    }
    //console.log('PeerBucket::updatePeer this.trapBuckets_=<',this.trapBuckets_,'>');
    if(this.fullBuckets_[distanceIndex] && this.fullBuckets_[distanceIndex][peer]) {
      this.fullBuckets_[distanceIndex][peer].ttr = ttr;
    }
    //console.log('PeerBucket::updatePeer this.fullBuckets_=<',this.fullBuckets_,'>');      
  }

  removePeer(peer) {
    //console.log('PeerBucket::removePeer peer=<',peer,'>');
    for(const bucketIndex in this.trapBuckets_) {
      const bucket = this.trapBuckets_[bucketIndex];
      if(bucket[peer]) {
        delete this.trapBuckets_[bucketIndex][peer];
      }
    }
    //console.log('PeerBucket::removePeer this.trapBuckets_=<',this.trapBuckets_,'>');
    for(const bucketIndex in this.fullBuckets_) {
      const bucket = this.fullBuckets_[bucketIndex];
      if(bucket[peer]) {
        delete this.fullBuckets_[bucketIndex][peer];
      }
    }
    //console.log('PeerBucket::removePeer this.fullBuckets_=<',this.fullBuckets_,'>');
    delete this.peersFlat_[peer];
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
  calcDistanceBit_(address,peer) {
    const addressBuf = base32.decode(address);
    const peerBuf = base32.decode(peer);
    const distanceBuf = bitwise.buffer.xor(addressBuf,peerBuf,false);
    //console.log('PeerRoute::calcDistance_ distanceBuf=<',distanceBuf,'>');   
    const distanceBit = bitwise.buffer.read(distanceBuf);
    //console.log('PeerRoute::calcDistance_ distanceBit=<',distanceBit,'>'); 
    let firstBit = -1;
    for(const bit of distanceBit) {
      firstBit++;
      if(bit) {
        break;
      }
    }
    //console.log('PeerRoute::calcDistance_ firstBit=<',firstBit,'>');
    return firstBit;
  }  
};
module.exports = PeerBucket;
