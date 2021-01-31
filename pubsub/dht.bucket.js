'use strict';
const base32 = require("base32.js");
const bitwise = require("bitwise");
const bigInt = require("big-integer");
const iConstBucketMax = 4;

class DHTBucket {
  constructor(node) {
    //console.log('DHTBucket::constructor node=<',node,'>');
    this.node_ = node;
    this.id_ = this.node_.id;
    const idBuf = base32.decode(this.id_);
    const idBit = bitwise.buffer.read(idBuf);
    //console.log('DHTBucket::constructor idBit=<',idBit,'>');
    this.buckets_ = [];
    for(const bit of idBit) {
      this.buckets_.push([]);
    }
    //console.log('DHTBucket::constructor this.buckets_=<',this.buckets_,'>');
    this.buckets_flat_ = [];
    this.buckets_flat_.push(this.id_);
  }
  update(node,endpoint) {
    //console.log('DHTBucket::update node=<',node,'>');
    //console.log('DHTBucket::update endpoint=<',endpoint,'>');
    if(endpoint.ttl > 1000 && endpoint.trap) {
      return;
    }
    const escape_ms = new Date() - new Date(endpoint.at);
    //console.log('DHTBucket::update escape_ms=<',escape_ms,'>');
    if(escape_ms > 1000) {
      return;
    }
    //console.log('DHTBucket::update node=<',node,'>');
    const nodeBuf = base32.decode(node);
    //console.log('DHTBucket::update nodeBuf=<',nodeBuf,'>');
    const nodeBit = bitwise.buffer.read(nodeBuf);
    //console.log('DHTBucket::update nodeBit=<',nodeBit,'>');
    const firstAt = nodeBit.indexOf(1);
    //console.log('DHTBucket::update firstAt=<',firstAt,'>');
    if(firstAt > -1) {
      const bucketCap = Math.floor((nodeBit.length - firstAt)/16) + 2;
      //console.log('DHTBucket::update bucketCap=<',bucketCap,'>');
      if(!this.buckets_[firstAt].includes(node)  
        && this.buckets_[firstAt].length < bucketCap
      ) {
        this.buckets_[firstAt].push(node);
        this.buckets_flat_.push(node);
      }
    }
    //console.log('DHTBucket::update this.buckets_flat_=<',this.buckets_flat_,'>');
  }
  remove(node) {
    //console.log('DHTBucket::remove node=<',node,'>');
    const flatHint = this.buckets_flat_.indexOf(node);
    if(flatHint > -1) {
      //console.log('DHTBucket::remove node=<',node,'>');
      //console.log('DHTBucket::remove flatHint=<',flatHint,'>');
      this.buckets_flat_.splice(flatHint,1);
    }
    for(const bucketIndex in this.buckets_) {
      //console.log('DHTBucket::remove bucketIndex=<',bucketIndex,'>');
      const hint = this.buckets_[bucketIndex].indexOf(node);
      if(hint > -1) {
        //console.log('DHTBucket::remove node=<',node,'>');
        //console.log('DHTBucket::remove hint=<',hint,'>');
        this.buckets_[bucketIndex].splice(hint,1);
      }
    }
  }
  /*
  addPeer(peer,rinfo,trap) {
    const totalInBacket = Object.keys(this.peersFlat_).length;
    if(totalInBacket >= iConstBucketMax) {
      return;
    }
    this.peersEntrance_[peer] = rinfo;
    
    //console.log('DHTBucket::addPeer peer=<',peer,'>');
    //console.log('DHTBucket::addPeer rinfo=<',rinfo,'>');
    //console.log('DHTBucket::addPeer trap=<',trap,'>');
    const distanceIndex = this.calcDistanceBit_(peer,this.id_);
    //console.log('DHTBucket::addPeer distanceIndex=<',distanceIndex,'>');
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
    //console.log('DHTBucket::addPeer this.trapBuckets_=<',this.trapBuckets_,'>');
    if(!this.fullBuckets_[distanceIndex]) {
      this.fullBuckets_[distanceIndex] = {};
    }
    if(!this.fullBuckets_[distanceIndex][peer]) {
      this.fullBuckets_[distanceIndex][peer] = {};
    }
    this.fullBuckets_[distanceIndex][peer].address = rinfo.address;
    this.fullBuckets_[distanceIndex][peer].port = rinfo.port;
    //console.log('DHTBucket::addPeer this.fullBuckets_=<',this.fullBuckets_,'>');
    this.peersFlat_[peer] = rinfo;
  }
  */
  fetchPeerInfo() {
    return this.peersFlat_;
  }
  fetchPeerEntrance() {
    return this.peersEntrance_;
  }

  updatePeer(peer,ttr) {
    //console.log('DHTBucket::updatePeer peer=<',peer,'>');
    //console.log('DHTBucket::updatePeer ttr=<',ttr,'>');
    //console.log('DHTBucket::updatePeer this.id_=<',this.id_,'>');
    const distanceIndex = this.calcDistanceBit_(peer,this.id_);
    //console.log('DHTBucket::updatePeer distanceIndex=<',distanceIndex,'>');
    if(!this.trapBuckets_[distanceIndex]) {
      this.trapBuckets_[distanceIndex] = {};
    }
    if(this.trapBuckets_[distanceIndex] && this.trapBuckets_[distanceIndex][peer]) {
      this.trapBuckets_[distanceIndex][peer].ttr = ttr;
    }
    //console.log('DHTBucket::updatePeer this.trapBuckets_=<',this.trapBuckets_,'>');
    if(this.fullBuckets_[distanceIndex] && this.fullBuckets_[distanceIndex][peer]) {
      this.fullBuckets_[distanceIndex][peer].ttr = ttr;
    }
    //console.log('DHTBucket::updatePeer this.fullBuckets_=<',this.fullBuckets_,'>');      
  }

  removePeer(peer) {
    //console.log('DHTBucket::removePeer peer=<',peer,'>');
    for(const bucketIndex in this.trapBuckets_) {
      const bucket = this.trapBuckets_[bucketIndex];
      if(bucket[peer]) {
        delete this.trapBuckets_[bucketIndex][peer];
      }
    }
    //console.log('DHTBucket::removePeer this.trapBuckets_=<',this.trapBuckets_,'>');
    for(const bucketIndex in this.fullBuckets_) {
      const bucket = this.fullBuckets_[bucketIndex];
      if(bucket[peer]) {
        delete this.fullBuckets_[bucketIndex][peer];
      }
    }
    //console.log('DHTBucket::removePeer this.fullBuckets_=<',this.fullBuckets_,'>');
    delete this.peersFlat_[peer];
    delete this.peersEntrance_[peer];
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
module.exports = DHTBucket;
