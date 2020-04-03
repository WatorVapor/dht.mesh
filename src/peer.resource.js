'use strict';
const fs = require('fs');
const path = require('path');
const PeerMachine = require('./peer.machine.js');
const PeerCrypto = require('./peer.crypto.js');
const level = require('level');
const strConstDBName = 'dht.store.db';

class PeerResource {
  constructor(config) {
    console.log('PeerResource::constructor: config.reps=<',config.reps,'>');
    this._pathPeer = config.reps.dht + '/datastore';
    if (!fs.existsSync(this._pathPeer)) {
      fs.mkdirSync(this._pathPeer,{ recursive: true });
    }    console.log('PeerResource::constructor: config=<',config,'>');
    this.machine_ = new PeerMachine(config);
    this._db = level(this._pathPeer + '/' + strConstDBName);
    this._crypto = new PeerCrypto(config);
    this._batch = {};
  }
  async put(key,dataOrig) {
    let data = dataOrig;
    if(typeof dataOrig === 'object') {
      data = JSON.stringify(dataOrig);
    }
    try {
      //console.log('PeerResource::put: key=<',key,'>');
      //console.log('PeerResource::put: data=<',data,'>');
      const resultSaved = await this._db.get(key);
      //console.log('PeerResource::put: key=<',key,'>');
      //console.log('PeerResource::put: resultSaved=<',resultSaved,'>');
      const addressSaved = this._crypto.calcResourceAddress(resultSaved);
      if(addressSaved === key) {
        //console.log('PeerResource::put: addressSaved === key=<',addressSaved === key,'>');
        return;
      } else {
        const result = await this._db.put(key,data);
        console.log('PeerResource::put: result=<',result,'>');
      }
    } catch(e) {
      if(e.notFound) {
        const result2 = await this._db.put(key,data);
        //console.log('PeerResource::put: result2=<',result2,'>');
      } else {
        console.log('PeerResource::put: e=<',e,'>');
      }
    }
  }
  
  async newBatch(cb) {
    try {
      this._batch[cb] = await this._db.batch();
    } catch(e) {
      console.log('PeerResource::putBatch: e=<',e,'>');
    }
  }

  async putBatch(key,dataOrig,cb) {
    try {
      let data = dataOrig;
      if(typeof dataOrig === 'object') {
        data = JSON.stringify(dataOrig);
      }
      await this._batch[cb].put(key,data);
    } catch(e) {
      console.log('PeerResource::putBatch: e=<',e,'>');
    }
  }
  async writeBatch (cb) {
    try {
      await this._batch[cb].write();
      delete this._batch[cb];
    } catch(e) {
      console.log('PeerResource::putBatch: e=<',e,'>');
    }
  }
  
  

  async get(address) {
    try {
      const result = await this._db.get(address);
      console.log('PeerResource::get: result=<',result,'>');
      const addressSaved = this._crypto.calcResourceAddress(result);
      if(addressSaved === address) {
        console.log('PeerResource::get: addressSaved === address=<',addressSaved === address,'>');
        return result;
      }
    } catch(e) {
      console.log('PeerResource::get: e=<',e,'>');
    }
    return false;
  }



  fetch(request,cb) {
    //console.log('PeerResource::fetch: request=<',request,'>');
    const keyAddress = request.address;
    //console.log('PeerResource::fetch: keyAddress=<',keyAddress,'>');    
    const keyPath = this.getPath4KeyAddress_(keyAddress);
    //console.log('PeerResource::fetch: keyPath=<',keyPath,'>');
    if (fs.existsSync(keyPath)) {
      const files = fs.readdirSync(keyPath);
      //console.log('PeerResource::fetch: files=<',files,'>');
      let totalResult = 0;
      const rankConter = {};
      for(const rank of files) {
        console.log('PeerResource::fetch: rank=<',rank,'>');
        const dbStats = keyPath + '/' + rank + '/' + strConstStatsName;
        try {
          const stats = require(dbStats);
          if(stats.count > 0) {
            totalResult += stats.count;
            rankConter[rank] = stats.count;
          }
        } catch(e) {
          
        }
      }
      const responseStats = {stats:{totalResult:totalResult},finnish:false};
      if(typeof cb === 'function') {
        cb(responseStats);
      }
      //console.log('PeerResource::fetch: rankConter=<',rankConter,'>');
      let start = request.start;
      if(!start) {
        start = 0;
      }
      //console.log('PeerResource::fetch: start=<',start,'>');
      const rankKeys = Object.keys(rankConter);
      rankKeys.sort((a,b) => {return parseInt(b) - parseInt(a);});
      //console.log('PeerResource::fetch: rankKeys=<',rankKeys,'>');
      let countCollect = 0;
      const rankGather = [];
      for(const rank of rankKeys) {
        const count = rankConter[rank];
        //console.log('PeerResource::fetch: count=<',count,'>');
        //console.log('PeerResource::fetch: rank=<',rank,'>');
        if(countCollect + count > start) {
          rankGather.push({rank:rank,collect:countCollect});
        }
        countCollect += count;
      }
      //console.log('PeerResource::fetch: rankGather=<',rankGather,'>');
      const prevEnd = request.prevEnd;
      const respResults = [];
      const self = this;
      const gatherResult = (index)=> {
        if(rankGather.length > index) {
          const rankInfo = rankGather[index];
          //console.log('PeerResource::fetch: rankInfo=<',rankInfo,'>');
          const rank = rankInfo.rank;
          const collect = rankInfo.collect;
          const dbPath = keyPath + '/' + rank + '/' + strConstDBName;
          //console.log('PeerResource::fetch: dbPath=<',dbPath,'>');
          let db = false;
          if(!this.dbOpenCache_[dbPath]) {
            db = level(dbPath);
            this.dbOpenCache_[dbPath] = db;
          } else {
            db = this.dbOpenCache_[dbPath];
          }
          const keyStreamOption = {};
          if(prevEnd) {
            keyStreamOption.gt = prevEnd;
          }
          console.log('PeerResource::fetch: keyStreamOption=<',keyStreamOption,'>');
          const keyStream = db.createKeyStream(keyStreamOption);
          keyStream.on('data',  (data) =>{
            console.log('PeerResource::fetch: data=<',data,'>');
            //console.log('PeerResource::fetch:keyStream data respResults=<',respResults,'>');
            //console.log('PeerResource::fetch:keyStream data request.cb=<',request.cb,'>');
            if(respResults.length >= iConstResourceOnce) {
              const responseObj = {results:respResults,finnish:true};
              console.log('PeerResource::fetch: responseObj=<',responseObj,'>');
              if(typeof cb === 'function') {
                cb(responseObj);
              }
              db.close();
              delete self.dbOpenCache_[dbPath];
            } else {
              respResults.push(data);
            }
            console.log('PeerResource::fetch: results=<',respResults,'>');
          });
          keyStream.on('end',  () =>{
            console.log('PeerResource::fetch:keyStream end respResults=<',respResults,'>');
            //console.log('PeerResource::fetch:keyStream end request.cb=<',request.cb,'>');            
            if(respResults.length < iConstResourceOnce) {
              gatherResult(index+1);
            } else {
              const responseObj = {results:respResults,finnish:true};
              console.log('PeerResource::fetch: responseObj=<',responseObj,'>');
              if(typeof cb === 'function') {
                cb(responseObj);
              }              
            }
          });
        } else {
          const responseObj = {results:respResults,finnish:true};
          console.log('PeerResource::fetch: responseObj=<',responseObj,'>');
          if(typeof cb === 'function') {
            cb(responseObj);
          }
        }
      }
      gatherResult(0);
    } else {
      const responseStats = {stats:{totalResult:0},finnish:true};
      if(typeof cb === 'function') {
        cb(responseStats);
      }
    }
  }
  
  
  getAddress_(resourceKey) {
    const resourceRipemd = new RIPEMD160().update(resourceKey).digest('hex');
    const resourceBuffer = Buffer.from(resourceRipemd,'hex');
    return base32.encode(resourceBuffer,bs32Option);
    return 
  }
  getPath4KeyAddress_(address) {
    let pathAddress = this._pathPeer;
    pathAddress += '/' + address.substring(0,3);
    pathAddress += '/' + address.substring(3,6);
    pathAddress += '/' + address;
    return pathAddress;
  }

  async saveNewResult_(resource,db,pPath) {
    const result2 = await db.put(resource, '');
    //console.log('PeerResource::saveNewResult_ result2=<',result2,'>');
    const statsPath = pPath + '/' + strConstStatsName;
    let stats = {};
    try {
      stats = require(statsPath);
    } catch(e) {
      
    }
    if(stats.count) {
      stats.count++;
    } else {
      stats.count = 1;
    }
    fs.writeFileSync(statsPath,JSON.stringify(stats));
  }


}
module.exports = PeerResource;

