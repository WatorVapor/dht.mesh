'use strict';
const fs = require('fs');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
const CryptoJS = require('crypto-js');
const base32 = require("base32.js");

const iConstMessageOutDateInMs = 1000 * 60;
const bs32Option = { type: "crockford", lc: true };

class DHTNode {
  constructor(config) {
    //console.log('DHTNode::constructor config=<',config,'>');
    this.config_ = config;
    if(!fs.existsSync(config.reps.dht)) {
      fs.mkdirSync(config.reps.dht,{ recursive: true });
    }
    this.keyPath = config.reps.dht + '/keyMaster.json';
    //console.log('DHTNode::constructor this.keyPath=<',this.keyPath,'>');
    if(fs.existsSync(this.keyPath)) {
      this.loadKey__();
    } else {
      this.createKey__();
    }
    //console.log('DHTNode::loadKey this.keyMaster=<',this.keyMaster,'>');
    this.calcKeyID__();
    //console.log('DHTNode::constructor this.id=<',this.id,'>');
    //console.log('DHTNode::constructor this.address=<',this.address,'>');
  }
  sign(msg) {
    let now = new Date();
    const signedMsg = {};
    signedMsg.p = msg;
    signedMsg.t = this.config_.trap;
    signedMsg.s = {};
    signedMsg.s.t = now.toGMTString();
    signedMsg.s.m = now.getMilliseconds();
    signedMsg.s.k = this.keyMaster.publicKey;
    
    let msgStr = JSON.stringify(signedMsg);
    let msgHash = CryptoJS.RIPEMD160(msgStr).toString(CryptoJS.enc.Base64);
    //console.log('DHTNode::sign msgHash=<',msgHash,'>');
    //console.log('DHTNode::sign this.secretKey=<',this.secretKey,'>');
    const signBuff = nacl.sign(nacl.util.decodeBase64(msgHash),this.secretKey);
    //console.log('DHTNode::sign signBuff=<',signBuff,'>');
    signedMsg.v = nacl.util.encodeBase64(signBuff);
    return signedMsg;
  }

  verify(msgJson) {
    const now = new Date();
    const msgTs = new Date(msgJson.s.t);
    msgTs.setMilliseconds(msgJson.s.m)
    const escape_time = now -msgTs;
    //console.log('DHTNode::verify escape_time=<',escape_time,'>');
    if(escape_time > iConstMessageOutDateInMs) {
      return false;
    }    
    const hashMsg = Object.assign({}, msgJson);
    delete hashMsg.v;
    let msgStr = JSON.stringify(hashMsg);
    //console.log('DHTNode::verify msgStr=<',msgStr,'>');
    let msgHash = CryptoJS.RIPEMD160(msgStr).toString(CryptoJS.enc.Base64);
    //console.log('DHTNode::verify msgHash=<',msgHash,'>');
    //console.log('DHTNode::verify msgJson=<',msgJson,'>');
    const pubKey = nacl.util.decodeBase64(msgJson.s.k);
    //console.log('DHTNode::verify pubKey=<',pubKey,'>');
    const signedVal = nacl.util.decodeBase64(msgJson.v);
    //console.log('DHTNode::verify signedVal=<',signedVal,'>');
    const openedMsg = nacl.sign.open(signedVal,pubKey);
    //console.log('DHTNode::verify openedMsg=<',openedMsg,'>');
    if(openedMsg) {
      const openedMsgB64 = nacl.util.encodeBase64(openedMsg);
      //console.log('DHTNode::verify openedMsgB64=<',openedMsgB64,'>');
      if(openedMsgB64 === msgHash) {
        return true;
      }
    }
    return false;
  }
  calcID(msgJson) {
    const keyRipemd = CryptoJS.RIPEMD160(msgJson.s.k).toString(CryptoJS.enc.Hex);
    const keyBuffer = Buffer.from(keyRipemd,'hex');
    return base32.encode(keyBuffer,bs32Option);
  }
  calcTopic(topic) {
    const topicRipemd = CryptoJS.RIPEMD160(topic).toString(CryptoJS.enc.Hex);
    const topicBuffer = Buffer.from(topicRipemd,'hex');
    return base32.encode(topicBuffer,bs32Option);
  }
  calcResourceAddress(resourceKey) {
    const resourceRipemd = CryptoJS.RIPEMD160(resourceKey).toString(CryptoJS.enc.Hex);
    const resourceBuffer = Buffer.from(resourceRipemd,'hex');
    return base32.encode(resourceBuffer,bs32Option);
  }

  
  
  loadKey__() {
    const keyJson = require(this.keyPath);
    //console.log('DHTNode::loadKey__ keyJson=<',keyJson,'>');
    this.keyMaster = keyJson;
    this.publicKey = nacl.util.decodeBase64(keyJson.publicKey);
    this.secretKey = nacl.util.decodeBase64(keyJson.secretKey);
  }
  createKey__() {
    const ed = new nacl.sign.keyPair();
    //console.log('DHTNode::createKey__ ed=<',ed,'>');
    const jwk = {kty:'ed25519'};
    jwk.publicKey = Buffer.from(ed.publicKey).toString('base64');
    jwk.secretKey = Buffer.from(ed.secretKey).toString('base64');
    //console.log('DHTNode::createKey__ jwk=<',jwk,'>');
    fs.writeFileSync(this.keyPath,JSON.stringify(jwk,undefined,2));
    this.keyMaster = jwk;
    this.publicKey = ed.publicKey;
    this.secretKey = ed.secretKey;
  }
  calcKeyID__() {
    //console.log('DHTNode::loadKey__ this.keyMaster=<',this.keyMaster,'>');
    const keyRipemd = CryptoJS.RIPEMD160(this.keyMaster.publicKey).toString(CryptoJS.enc.Hex);
    const keyBuffer = Buffer.from(keyRipemd,'hex');
    //console.log('DHTNode::calcKeyID__ keyBuffer =<',keyBuffer ,'>');
    this.id = base32.encode(keyBuffer,bs32Option);
    this.address = keyBuffer;
  }
}
module.exports = DHTNode;

