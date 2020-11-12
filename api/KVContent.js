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
      //console.log('KVContent::put: saved metaJson[address]=<',metaJson[address],'>');
      return ;
    }
    const storePath = `${keyPath}/store`;
    //console.log('KVContent::put: storePath=<',storePath,'>');
    let offset = 0;
    try {
      const stat = fs.statSync(storePath);
      //console.log('KVContent::put: stat=<',stat,'>');
      offset = stat.size;
    } catch (statErr) {
      console.log('KVContent::put: statErr=<',statErr,'>');
    }
    //console.log('KVContent::put: metaJson=<',metaJson,'>');
    fs.appendFileSync(storePath,content);
    try {
      const stat = fs.statSync(storePath);
      //console.log('KVContent::put: stat=<',stat,'>');
      metaJson[address] = {
        offset:offset,
        size:stat.size - offset
      };
      fs.writeFileSync(metaJsonPath,JSON.stringify(metaJson));
    } catch (statErr) {
      console.log('KVContent::put: statErr=<',statErr,'>');
    }
    return address;
  }
  
  get(address) {
    let keyPath = this.getKeyDir_(address);
    //console.log('KVContent::get: keyPath=<',keyPath,'>');
    if (fs.existsSync(keyPath)) {
      const metaJsonPath = `${keyPath}/meta.json`;
      //console.log('KVContent::get: metaJsonPath=<',metaJsonPath,'>');
      try {
        const metaJson = require(metaJsonPath);
        //console.log('KVContent::get: metaJson=<',metaJson,'>');
        if(metaJson && metaJson[address]) {
          const metaInfo = metaJson[address];
          //console.log('KVContent::get: metaInfo=<',metaInfo,'>');
          const storePath = `${keyPath}/store`;
          const fd = fs.openSync(storePath, 'r');
          //console.log('KVContent::get: fd=<',fd,'>');
          if(fd > 0) {
            const buff = Buffer.alloc(metaInfo.size);
            const read_size = fs.readSync(fd, buff, 0, metaInfo.size, metaInfo.offset);
            //console.log('KVContent::get: read_size=<',read_size,'>');
            //console.log('KVContent::get: buff=<',buff.toString('utf8', 0, metaInfo.size),'>');
            fs.closeSync(fd);
            return buff.toString('utf8', 0, metaInfo.size);
          }
        }
        return {notFound:true,address:address};;
      } catch (metaErr) {
        return metaErr;
      }
      return content;
    }
    const err = {notFound:true,address:address};
    return err;
  }
  
  getKeyDir_(keyB32) {
    let pathDir = this._root;
    pathDir += '/' + keyB32.substring(0,2);
    pathDir += '/' + keyB32.substring(2,4);
    //console.log('KVContent::getKeyDir_: pathDir=<',pathDir,'>');
    return pathDir;
  }
  
  
  /*
  getKeyDir_(keyB32) {
    let pathDir = this._root;
    pathDir += '/test';
    console.log('KVContent::getKeyDir_: pathDir=<',pathDir,'>');
    return pathDir;
  }
  */

}
