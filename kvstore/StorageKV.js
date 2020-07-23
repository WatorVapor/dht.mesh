'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const level = require('level');

const bs32Option = { type: "crockford", lc: true };
const iConstCacheActiveCount = 1024;
const iConstItemOfOnce = 16;

class StorageKV {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dbs_ = {};
    const self = this;
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('StorageKV::.constructor:: peerInfo=<',peerInfo,'>');
      self.repos_ = `${peerInfo.reps.dht}/storekv`;
      self.id = peerInfo.id;
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  onRemoteMsg(msg) {
    //console.log('StorageKV::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload && msg.spread.payload.kv) {
      this.onSpreadMsg_(msg.spread.payload.kv,msg.address,msg.from);
    } else if(msg.delivery && msg.delivery.payload && msg.delivery.payload.kv) {
      // empty...
    } else if(msg.loopback) {
      // empty...
    } else {
      console.log('StorageKV::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onSpreadMsg_(kvReq,address,from) {
    //console.log('StorageKV::onSpreadMsg_:: kvReq=<',kvReq,'>');
    //console.log('StorageKV::onSpreadMsg_:: address=<',address,'>');
    if(kvReq.store) {
      this.onStore_(kvReq.store,address)
    } else if (kvReq.fetch) {
      this.onFetch_(kvReq.fetch,address,from);
    } else {
      console.log('StorageKV::onSpreadMsg_:: kvReq=<',kvReq,'>');
    }
  }
  async onStore_(content,address) {
    //console.log('StorageKV::onStore_:: content=<',content,'>');
    //console.log('StorageKV::onStore_:: address=<',address,'>');
    const db = this.getLevelDB_(address);
    try {
      const isSaved = await db.get(address);
    } catch(err) {
      //console.log('StorageKV::onStore_:: err=<',err,'>');
      if (err.notFound) {
        await db.put(address,JSON.stringify(content));
      } else {
        console.log('StorageKV::onStore_:: isSaved=<',isSaved,'>');
      }
    }
  }
  
  async onFetch_(fetch,address,from) {
    //console.log('StorageKV::onFetch_:: fetch=<',fetch,'>');
    //console.log('StorageKV::onFetch_:: address=<',address,'>');
    //console.log('StorageKV::onFetch_:: from=<',from,'>');
    const db = this.getLevelDB_(address);
    const deliveryPayload = {
      address:address
    };
    try {
      const content = await db.get(address);
      //console.log('StorageKV::onFetch_:: content=<',content,'>');
      deliveryPayload.content = content;
    } catch(err) {
      console.log('StorageKV::onFetch_:: err=<',err,'>');
    }
    this.deliveryReply_(deliveryPayload,from);
  }
  deliveryReply_(payload,from) {
    //console.log('StorageKV::deliveryReply_:: payload=<',payload,'>');
    //console.log('StorageKV::deliveryReply_:: from=<',from,'>');
    //console.log('StorageKV::deliveryReply_:: this.id=<',this.id,'>');
    const kvPayload = {kvR:payload};
    if(this.id !== from) {
      this.dht_.delivery(from,kvPayload);
    } else {
      this.dht_.loopback(from,kvPayload);
    }
  }
  
  getLevelDB_(address) {
    const dbPrefix = address.slice(0,2);
    const dbDir = `${this.repos_}/${dbPrefix}`;
    //console.log('StorageKV::getLevelDB_:: dbDir=<',dbDir,'>');
    if(!fs.existsSync(dbDir)){
      fs.mkdirSync(dbDir,{recursive :true});
    }
    const dbIndex =  `${dbPrefix}`;
    if(this.dbs_[dbIndex]) {
      const db = this.dbs_[dbIndex].db;
      this.dbs_[dbIndex].count = iConstCacheActiveCount;
      return db;
    } else {
      const dbPath = `${dbDir}/store.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      return db;
    }    
  }
};

const daemon = new StorageKV();
