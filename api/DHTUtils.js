'use strict';
const base32 = require("base32.js");
const CryptoJS = require('crypto-js');
const bs32Option = { type: "crockford", lc: true };
const nacl = require('tweetnacl');

class DHTUtils {
  constructor() {
    console.log('DHTUtils::constructor');
  }
  calcAddress(content) {
    const contentsSha = CryptoJS.SHA3(content).toString(CryptoJS.enc.Hex);
    const contentRipemd = CryptoJS.RIPEMD160(contentsSha).toString(CryptoJS.enc.Hex);
    //console.log('DHTUtils::calcAddress:: contentRipemd=<',contentRipemd,'>');
    const contentBuffer = Buffer.from(contentRipemd,'hex');
    return base32.encode(contentBuffer,bs32Option);
  }
  random() {
    const buf = nacl.randomBytes(256).toString('hex');
    return this.calcAddress(buf);
  }
}

module.exports = DHTUtils;
