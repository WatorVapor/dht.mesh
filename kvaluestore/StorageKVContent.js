'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const KVContent = require('../api/KVContent.js');
const fs = require('fs');

const iConstCacheActiveCount = 10;
const iConstCacheMaxSize = 2048;

class StorageKVContent {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    const self = this;
    this.debug_ = true;
    this.dht_.OnConnected = ()=> {
      console.log('StorageKVContent::constructor::OnConnected');
      self.connectDHT_();
    }
    this.dht_.OnDisConnected = ()=> {
      console.log('StorageKVContent::constructor::OnDisConnected');
    }
    setInterval(()=>{
      self.CheckCachedHandler_();
    },1000*10);
  }
  onRemoteMsg(msg) {
    //console.log('StorageKVContent::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload) {
      if(msg.spread.payload.kv) {
        this.onSpreadMsg_(msg.spread.payload.kv,msg.address,msg.from,msg.spread.payload.tag);
      } else if(msg.spread.payload.kw) {
        // empty...
      } else {
        console.log('StorageKVContent::onRemoteMsg:: msg=<',msg,'>');
      }
    } else if(msg.delivery && msg.delivery.payload) {
      // empty...
    } else if(msg.loopback) {
      // empty...
    } else {
      console.log('StorageKVContent::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onSpreadMsg_(kvReq,address,from,tag) {
    //console.log('StorageKVContent::onSpreadMsg_:: kvReq=<',kvReq,'>');
    //console.log('StorageKVContent::onSpreadMsg_:: address=<',address,'>');
    if(kvReq.store) {
      this.onStore_(kvReq.store,address,tag)
    } else if (kvReq.fetch) {
      this.onFetch_(kvReq.fetch,address,from,tag);
    } else {
      console.log('StorageKVContent::onSpreadMsg_:: kvReq=<',kvReq,'>');
    }
  }
  
  async onStore_(content,address,tag) {
    //console.log('StorageKVContent::onStore_:: content=<',content,'>');
    //console.log('StorageKVContent::onStore_:: address=<',address,'>');
    //console.log('StorageKVContent::onFetch_:: this.kv_=<',this.kv_,'>');
    if(typeof content === 'object') {
      content = JSON.stringify(content);
    }
    this.kv_.put(content,address);
    /*
    const db = this.getLevelDB_(address);
    try {
      const isSaved = await db.get(address);
    } catch(err) {
      //console.log('StorageKVContent::onStore_:: err=<',err,'>');
      if (err.notFound) {
        if(this.debug_) {
          console.log('StorageKVContent::onStore_:: address=<',address,'>');
        }
        await db.put(address,JSON.stringify(content));
      } else {
        console.log('StorageKVContent::onStore_:: isSaved=<',isSaved,'>');
      }
    }
    */
  }
  
  async onFetch_(fetch,address,from,tag) {
    console.log('StorageKVContent::onFetch_:: fetch=<',fetch,'>');
    console.log('StorageKVContent::onFetch_:: address=<',address,'>');
    console.log('StorageKVContent::onFetch_:: from=<',from,'>');
    console.log('StorageKVContent::onFetch_:: this.repos_=<',this.repos_,'>');
    /*
    const db = this.getLevelDB_(address);
    const deliveryPayload = {
      address:address
    };
    try {
      if(this.debug_) {
        console.log('StorageKVContent::onFetch_:: address=<',address,'>');
      }
      const content = await db.get(address);
      //console.log('StorageKVContent::onFetch_:: content=<',content,'>');
      deliveryPayload.content = content;
    } catch(err) {
      console.log('StorageKVContent::onFetch_:: err=<',err,'>');
    }
    this.deliveryReply_(deliveryPayload,from,tag);
    */
  }
  deliveryReply_(payload,from,tag) {
    //console.log('StorageKVContent::deliveryReply_:: payload=<',payload,'>');
    //console.log('StorageKVContent::deliveryReply_:: from=<',from,'>');
    //console.log('StorageKVContent::deliveryReply_:: this.id=<',this.id,'>');
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
    //console.log('StorageKVContent::getLevelDB_:: dbDir=<',dbDir,'>');
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
      console.log('StorageKVContent::constructor:: peerInfo=<',peerInfo,'>');
      if(peerInfo.reps && peerInfo.id) {
        self.repos_ = `${peerInfo.reps.dht}/kvalue.store`;
        self.id = peerInfo.id;
        self.kv_ = new KVContent(self.repos_);
      }
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });    
  }
  CheckCachedHandler_() {
    /*
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
    */
  }
};

const daemon = new StorageKVContent();
