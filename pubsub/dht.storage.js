'use strict';
const fs = require('fs');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
const CryptoJS = require('crypto-js');
const base32 = require("base32.js");

const iConstMessageOutDateInMs = 1000 * 60;
const bs32Option = { type: "crockford", lc: true };

class DHTStorage {
  constructor(config) {
    //console.log('DHTStorage::constructor config=<',config,'>');
    this.config_ = config;
  }
  store(msg) {
    console.log('DHTStorage::store msg=<',msg,'>');
  }
}
module.exports = DHTStorage;

