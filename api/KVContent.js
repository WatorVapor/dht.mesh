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
  put(content,address) {
    const key = this.utils_.calcAddress(content);
    //console.log('KVContent::put: key=<',key,'>');
    //console.log('KVContent::put: address=<',address,'>');
    if(key !== address) {
      return;
    }
    const keyPath = this.getKeyDir_(key);
    //console.log('KVContent::put: keyPath=<',keyPath,'>');
    if (!fs.existsSync(keyPath)) {
      fs.mkdirSync(keyPath,{ recursive: true });
    }
    const metaJsonPath = `${keyPath}/meta.json`;
    //console.log('KVContent::put: metaJsonPath=<',metaJsonPath,'>');
    let metaJson = {};
    try {
      metaJson = require(metaJsonPath);
    } catch (metaErr) {
      console.log('KVContent::put: metaErr=<',metaErr,'>');
      metaJson = {};
    }
    if(metaJson[address]) {
      console.log('KVContent::put: saved metaJson[address]=<',metaJson[address],'>');
      return ;
    }
    const storePath = `${keyPath}/store`;
    console.log('KVContent::put: storePath=<',storePath,'>');
    let offset = 0;
    try {
      const stat = fs.statSync(storePath);
      //console.log('KVContent::put: stat=<',stat,'>');
      offset = stat.size;
    } catch (statErr) {
      console.log('KVContent::put: statErr=<',statErr,'>');
    }
    metaJson[address] = {
      offset:offset,
      size:content.length
    };
    console.log('KVContent::put: metaJson=<',metaJson,'>');
    fs.appendFileSync(storePath,content);
    fs.writeFileSync(metaJsonPath,JSON.stringify(metaJson));
    return address;
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
  
  getKeyDir_(keyB32) {
    let pathDir = this._root 
    pathDir += '/' + keyB32.substring(0,3);
    console.log('KVContent::getKeyDir_: pathDir=<',pathDir,'>');
    return pathDir;
  }
}
