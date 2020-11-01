const fs = require('fs');
const path = require('path');
const DHTUtils = require("./DHTUtils.js");

module.exports = class KVContent {
  constructor(path) {
    this._root = path;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path,{ recursive: true });
    }
    this.utils_ = new DHTUtils();
  }
  put(content) {
    const key = this.utils_.calcAddress(content);
    const keyAddress = this.getKeyAddress_(key);
    //console.log('KVContent::put: keyAddress=<',keyAddress,'>');
    const keyPath = path.dirname(keyAddress);
    //console.log('KVContent::put: keyPath=<',keyPath,'>');
    if (!fs.existsSync(keyPath)) {
      fs.mkdirSync(keyPath,{ recursive: true });
    }
    fs.writeFileSync(keyAddress,content);
    return keyAddress;
  }
  
  get(key) {
    let keyAddress = this.getKeyAddress_(key);
    //console.log('KVContent::get: keyAddress=<',keyAddress,'>');
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
    pathAddress += '/' + keyB32.substring(0,2);
    pathAddress += '/' + keyB32;
    //console.log('KVContent::get: pathAddress=<',pathAddress,'>');
    return pathAddress;
  }
}
