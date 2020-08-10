'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const level = require('level');

const iConstCacheActiveCount = 10;
const iConstCacheMaxSize = 1024;
const iConstItemOfOnce = 16;

class StorageKV {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dbs_ = {};
    const self = this;
    this.dht_.OnConnected = ()=> {
      console.log('StorageKV::constructor::OnConnected');
      self.connectDHT_();
    }
    this.dht_.OnDisConnected = ()=> {
      console.log('StorageKV::constructor::OnDisConnected');
    }
    setInterval(()=>{
      self.CheckCachedHandler_();
    },1000*10);
  }
  onRemoteMsg(msg) {
    //console.log('StorageKV::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload && msg.spread.payload.kv) {
      this.onSpreadMsg_(msg.spread.payload.kv,msg.address,msg.from,msg.spread.payload.tag);
    } else if(msg.spread && msg.spread.payload && msg.spread.payload.kw) {
      // empty...
    } else if(msg.delivery && msg.delivery.payload && msg.delivery.payload.kw) {
      // empty...
    } else if(msg.delivery && msg.delivery.payload && msg.delivery.payload.kv) {
      // empty...
    } else if(msg.loopback) {
      // empty...
    } else {
      console.log('StorageKV::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onSpreadMsg_(kvReq,address,from,tag) {
    //console.log('StorageKV::onSpreadMsg_:: kvReq=<',kvReq,'>');
    //console.log('StorageKV::onSpreadMsg_:: address=<',address,'>');
    if(kvReq.store) {
      this.onStore_(kvReq.store,address,tag)
    } else if (kvReq.fetch) {
      this.onFetch_(kvReq.fetch,address,from,tag);
    } else {
      console.log('StorageKV::onSpreadMsg_:: kvReq=<',kvReq,'>');
    }
  }
  async onStore_(content,address,tag) {
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
  
  async onFetch_(fetch,address,from,tag) {
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
    this.deliveryReply_(deliveryPayload,from,tag);
  }
  deliveryReply_(payload,from,tag) {
    //console.log('StorageKV::deliveryReply_:: payload=<',payload,'>');
    //console.log('StorageKV::deliveryReply_:: from=<',from,'>');
    //console.log('StorageKV::deliveryReply_:: this.id=<',this.id,'>');
    const kvPayload = {kvR:payload,tag:tag};
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
  
  connectDHT_() {
    const self = this;
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('StorageKV::.constructor:: peerInfo=<',peerInfo,'>');
      if(peerInfo.reps && peerInfo.id) {
        self.repos_ = `${peerInfo.reps.dht}/kvalue.store`;
        self.id = peerInfo.id;
      }
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });    
  }
  CheckCachedHandler_() {
    const dbIndexs = Object.keys(this.dbs_);
    //console.log('StorageKW::CheckCachedHandler_:: dbIndexs.length=<',dbIndexs.length,'>');
    let clearOld = false;
    if(dbIndexs.length > iConstCacheMaxSize) {
      clearOld = true;
    }
    for(const dbIndex of dbIndexs) {
      //console.log('StorageKW::CheckCachedHandler_:: dbIndex=<',dbIndex,'>');
      const dbStats = this.dbs_[dbIndex];
      //console.log('StorageKW::CheckCachedHandler_:: dbStats.count=<',dbStats.count,'>');
      dbStats.count--;
      if(clearOld && dbStats.count < 0) {
        delete this.dbs_[dbIndex];
      }
    }
  }
};

const daemon = new StorageKV();
