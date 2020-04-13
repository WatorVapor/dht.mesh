'use strict';
const fs = require('fs');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
const CryptoJS = require('crypto-js');
const base32 = require("base32.js");

const iConstMessageOutDateInMs = 1000 * 60;
const bs32Option = { type: "crockford", lc: true };

class PeerCrypto {
  constructor(config) {
    //console.log('PeerCrypto::constructor config=<',config,'>');
    if(!fs.existsSync(config.reps.dht)) {
      fs.mkdirSync(config.reps.dht,{ recursive: true });
    }
    this.keyPath = config.reps.dht + '/keyMaster.json';
    //console.log('PeerCrypto::constructor this.keyPath=<',this.keyPath,'>');
    if(fs.existsSync(this.keyPath)) {
      this.loadKey__();
    } else {
      this.createKey__();
    }
    //console.log('PeerCrypto::loadKey this.keyMaster=<',this.keyMaster,'>');
    this.calcKeyID__();
    //console.log('PeerCrypto::constructor this.id=<',this.id,'>');
    //console.log('PeerCrypto::constructor this.address=<',this.address,'>');
  }
  sign(msg) {
    let now = new Date();
    const signedMsg = Object.assign({}, msg);
    signedMsg.sign = {};
    signedMsg.sign.ts = now.toGMTString();
    signedMsg.sign.ms = now.getMilliseconds();
    signedMsg.sign.pubKey = this.keyMaster.publicKey;
    
    let msgStr = JSON.stringify(signedMsg);
    let msgHash = CryptoJS.RIPEMD160(msgStr).toString(CryptoJS.enc.Base64);
    //console.log('PeerCrypto::sign msgHash=<',msgHash,'>');
    //console.log('PeerCrypto::sign this.secretKey=<',this.secretKey,'>');
    const signBuff = nacl.sign(nacl.util.decodeBase64(msgHash),this.secretKey);
    //console.log('PeerCrypto::sign signBuff=<',signBuff,'>');
    signedMsg.verify = {} 
    signedMsg.verify.hash = msgHash;
    signedMsg.verify.signed = nacl.util.encodeBase64(signBuff);
    return signedMsg;
  }

  verify(msgJson) {
    const now = new Date();
    const msgTs = new Date(msgJson.sign.ts);
    msgTs.setMilliseconds(msgJson.sign.ms)
    const escape_time = now -msgTs;
    //console.log('PeerCrypto::verify escape_time=<',escape_time,'>');
    if(escape_time > iConstMessageOutDateInMs) {
      return false;
    }    
    const hashMsg = Object.assign({}, msgJson);
    delete hashMsg.verify;
    let msgStr = JSON.stringify(hashMsg);
    //console.log('PeerCrypto::verify msgStr=<',msgStr,'>');
    let msgHash = CryptoJS.RIPEMD160(msgStr).toString(CryptoJS.enc.Base64);
    //console.log('PeerCrypto::verify msgHash=<',msgHash,'>');
    if(msgHash !== msgJson.verify.hash) {
      console.log('PeerCrypto::verify msgJson=<',msgJson,'>');
      console.log('PeerCrypto::verify msgHash=<',msgHash,'>');
      return false;
    }
    //console.log('PeerCrypto::verify msgJson=<',msgJson,'>');
    const pubKey = nacl.util.decodeBase64(msgJson.sign.pubKey);
    //console.log('PeerCrypto::verify pubKey=<',pubKey,'>');
    const signedVal = nacl.util.decodeBase64(msgJson.verify.signed);
    //console.log('PeerCrypto::verify signedVal=<',signedVal,'>');
    const openedMsg = nacl.sign.open(signedVal,pubKey);
    //console.log('PeerCrypto::verify openedMsg=<',openedMsg,'>');
    if(openedMsg) {
      const openedMsgB64 = nacl.util.encodeBase64(openedMsg);
      //console.log('PeerCrypto::verify openedMsgB64=<',openedMsgB64,'>');
      if(openedMsgB64 === msgJson.verify.hash) {
        return true;
      }
    }
    return false;
  }
  calcID(msgJson) {
    const keyRipemd = CryptoJS.RIPEMD160(msgJson.sign.pubKey).toString(CryptoJS.enc.Hex);
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
    //console.log('PeerCrypto::loadKey__ keyJson=<',keyJson,'>');
    this.keyMaster = keyJson;
    this.publicKey = nacl.util.decodeBase64(keyJson.publicKey);
    this.secretKey = nacl.util.decodeBase64(keyJson.secretKey);
  }
  createKey__() {
    const ed = new nacl.sign.keyPair();
    //console.log('PeerCrypto::createKey__ ed=<',ed,'>');
    const jwk = {kty:'ed25519'};
    jwk.publicKey = Buffer.from(ed.publicKey).toString('base64');
    jwk.secretKey = Buffer.from(ed.secretKey).toString('base64');
    //console.log('PeerCrypto::createKey__ jwk=<',jwk,'>');
    fs.writeFileSync(this.keyPath,JSON.stringify(jwk,undefined,2));
    this.keyMaster = jwk;
    this.publicKey = ed.publicKey;
    this.secretKey = ed.secretKey;
  }
  calcKeyID__() {
    //console.log('PeerCrypto::loadKey__ this.keyMaster=<',this.keyMaster,'>');
    const keyRipemd = CryptoJS.RIPEMD160(this.keyMaster.publicKey).toString(CryptoJS.enc.Hex);
    const keyBuffer = Buffer.from(keyRipemd,'hex');
    //console.log('PeerCrypto::calcKeyID__ keyBuffer =<',keyBuffer ,'>');
    this.id = base32.encode(keyBuffer,bs32Option);
    this.address = keyBuffer;
  }
}
module.exports = PeerCrypto;

