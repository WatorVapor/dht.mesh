'use strict';
const base32 = require("base32.js");
const bitwise = require("bitwise");
const bigInt = require("big-integer");
const iConstBucketMax = 4;
const DHTUtils = require('./dht.utils.js');
const utils = new DHTUtils();
const MaxBitOf160 = [];
for(let i = 0;i <160;i++) {
  MaxBitOf160.push(1);
}
//console.log(':: MaxBitBufOf160.length=<',MaxBitOf160.length,'>');
const MaxBitBufOf160 = bitwise.buffer.create(MaxBitOf160);
//console.log(':: MaxBitBufOf160=<',MaxBitBufOf160,'>');
const MaxBigIntOf160 = bigInt(MaxBitBufOf160.toString('hex'),16);
//console.log(':: MaxBigIntOf160=<',MaxBigIntOf160,'>');

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
  near(address) {
    console.log('DHTBucket::near address=<',address,'>');
    const address2 = utils.calcAddress(address);
    const address3 = utils.calcAddress(address2);
    return this.near_(address,address2,address3);
  }
  near_(add1,add2,add3) {
    let near1 = false;
    let near2 = false;
    let near3 = false;
    let value1 = MaxBigIntOf160;
    let value2 = MaxBigIntOf160;
    let value3 = MaxBigIntOf160;
    //console.log('DHTBucket::near_ value1=<',value1,'>');
    for(const nodeId of this.buckets_flat_) {
      //console.log('DHTBucket::near_ nodeId=<',nodeId,'>');
      //const endPoint = this.buckets_flat_[nodeId];
      const distance1 = this.calcDistance_(add1,nodeId);
      //console.log('DHTBucket::near_ distance1=<',distance1,'>');
      if(distance1 < value1 ) {
        value1 = distance1;
        near1 = nodeId;
      }
      const distance2 = this.calcDistance_(add2,nodeId);
      //console.log('DHTBucket::near_ distance2=<',distance2,'>');
      if(distance2 < value2 ) {
        value2 = distance2;
        near2 = nodeId;
      }
      const distance3 = this.calcDistance_(add3,nodeId);
      //console.log('DHTBucket::near_ distance3=<',distance3,'>');
      if(distance3 < value3 ) {
        value3 = distance3;
        near3 = nodeId;
      }
    }
    const nearGate = [];
    nearGate.push(near1);
    nearGate.push(near2);
    nearGate.push(near3);
    return nearGate;
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
