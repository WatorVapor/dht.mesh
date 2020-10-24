const fs = require('fs');
const path = require('path');
const DHTUtils = require("./DHTUtils.js");

module.exports = class KVFolder {
  constructor(path) {
    this._root = path;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path,{ recursive: true });
    }
    this.utils_ = new DHTUtils();
  }
  put(key,content) {
    let keyAddress = this.getKeyAddress_(key);
    //console.log('KVFolder::put: keyAddress=<',keyAddress,'>');
    let keyPath = path.dirname(keyAddress);
    //console.log('KVFolder::put: keyPath=<',keyPath,'>');
    if (!fs.existsSync(keyPath)) {
      fs.mkdirSync(keyPath,{ recursive: true });
    }
    fs.writeFileSync(keyAddress,content);
    return keyAddress;
  }
  
  get(key) {
    let keyAddress = this.getKeyAddress_(key);
    //console.log('KVFolder::get: keyAddress=<',keyAddress,'>');
    if (fs.existsSync(keyAddress)) {
      let content = fs.readFileSync(keyAddress, 'utf8');
      return content;
    }
    const err = {notFound:true,address:keyAddress};
    return err;
  }
  
  getKeyAddress_(key) {
    const keyB32 = this.utils_.calcAddress(key);
    let pathAddress = this._root 
    pathAddress += '/' + keyB32.substring(0,3);
    pathAddress += '/' + keyB32.substring(3,6);
    pathAddress += '/' + keyB32.substring(6,9);
    pathAddress += '/' + keyB32;
    //console.log('KVFolder::get: pathAddress=<',pathAddress,'>');
    return pathAddress;
  }
}
