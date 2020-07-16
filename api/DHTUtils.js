'use strict';
const base32 = require("base32.js");
const CryptoJS = require('crypto-js');
const bs32Option = { type: "crockford", lc: true };

class DHTUtils {
  constructor(daemonChannel) {
    console.log('DHTUtils::constructor');
  }
  calcAddress(content) {
    const contentsSha3 = CryptoJS.SHA3(content).toString(CryptoJS.enc.Hex);
    const contentRipemd = CryptoJS.RIPEMD160(contentsSha3).toString(CryptoJS.enc.Hex);
    //console.log('DHTUtils::calcAddress:: contentRipemd=<',contentRipemd,'>');
    const contentBuffer = Buffer.from(contentRipemd,'hex');
    return base32.encode(contentBuffer,bs32Option);
  }
}

module.exports = DHTUtils;
