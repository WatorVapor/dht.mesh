'use strict';
//const bs58 = require('bs58');
const base32 = require("base32.js");

class PeerPlace {
  constructor(address,peers) {
    //console.log('PeerPlace::constructor peers=<',peers,'>');
    //this.key_ = key;
    //this.peers_ = peers;
    //this.crypto_ = crypto;
    this.address_ = address
    this.peers_ = [];
    //console.log('PeerPlace::constructor this.address_=<',this.address_,'>');
    let maxDistance = Buffer.alloc(this.address_.length);
    maxDistance.fill(0x0);
    //let maxDistance = '';
    let nearPeer = '';
    let minDistance = Buffer.alloc(this.address_.length);;
    minDistance.fill(0xff);
    //let minDistance = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
    let fastPeer = ''
    const distanceZero = this.calcDistance_(this.address_,this.address_);
    //console.log('PeerPlace::constructor distanceZero=<',distanceZero,'>');
    for(const peer in peers) {
      this.peers_.push(peer);
      //console.log('PeerPlace::constructor peer=<',peer,'>');
      const distance = this.calcDistance_(this.address_,peer);
      //console.log('PeerPlace::constructor distance=<',distance,'>');
      //if(this.btBuff_(distance,maxDistance)) {
      if(distance > maxDistance) {
        nearPeer = peer;
        maxDistance = distance;
      }
      //if(this.ltBuff_(distance,minDistance)) {
      if(distance < minDistance) {
        fastPeer = peer;
        minDistance = distance;
      }
    }
    this.nearest = nearPeer;
    this.farthest = fastPeer;
  }
  isFinal(peer) {
    if(this.nearest === peer) {
      return true;
    }
    if(this.farthest === peer) {
      return true;
    }
    return false;
  }
  calcDistance_(address,peer) {
    //console.log('PeerPlace::calcDistance_ address=<',address,'>');
    //console.log('PeerPlace::calcDistance_ peer=<',peer,'>');
    const addressBuf = base32.decode(address);
    const peerBuf = base32.decode(peer);
    //console.log('PeerPlace::calcDistance_ addressBuf=<',addressBuf.toString('hex'),'>');
    //console.log('PeerPlace::calcDistance_ peerBuf=<',peerBuf.toString('hex'),'>');
    const distanceBuf = Buffer.alloc(peerBuf.length);
    for (let i = 0; i < addressBuf.length,i < peerBuf.length,i < distanceBuf.length; i++) {
      const distanceElem = addressBuf[i] ^ peerBuf[i];
      //console.log('PeerPlace::calcDistance_ distanceElem=<',distanceElem,'>');
      distanceBuf[i] = distanceElem;
    }
    //console.log('PeerPlace::calcDistance_ distanceBuf=<',distanceBuf,'>');
    //return base32.encode(distanceBuf);
    return distanceBuf.toString('hex');
  }
  btBuff_(a,b) {
    for (let i = 0; i < a.length,i < a.length,i < b.length; i++) {
      if(a[i] < b[i]) {
        return false;
      }
    }
    return true;
  }
  ltBuff_(a,b) {
    for (let i = 0; i < a.length,i < a.length,i < b.length; i++) {
      if(a[i] > b[i]) {
        return false;
      }
    }
    return true;
  }
}

module.exports = PeerPlace;
