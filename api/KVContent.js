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
    const keyPath = this.getKeyDir_(key);
    //console.log('KVContent::put: keyPath=<',keyPath,'>');
    if (!fs.existsSync(keyPath)) {
      fs.mkdirSync(keyPath,{ recursive: true });
    }
    fs.writeFileSync(keyAddress,content);
    return keyAddress;
  }
  
  get(key) {
    let keyPath = this.getKeyAddress_(key);
    //console.log('KVContent::get: keyPath=<',keyPath,'>');
    if (fs.existsSync(keyPath)) {
      return content;
    }
    const err = {notFound:true,address:keyAddress};
    return err;
  }
  
  getKeyDir_(key) {
    const keyB32 = this.utils_.calcAddress(key);
    let pathDir = this._root 
    pathDir += '/' + keyB32.substring(0,2);
    //console.log('KVContent::getKeyDir_: pathDir=<',pathDir,'>');
    return pathDir;
  }
}
