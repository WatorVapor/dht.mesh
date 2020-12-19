'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');

const { MongoClient } = require('mongodb');
const dbURL = `mongodb://%2Fdev%2Fshm%2Fmongodb-27017.sock`;
const connectOption = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

const iConstCacheActiveCount = 10;
const iConstCacheMaxSize = 2048;

class StorageKVMongo {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    const self = this;
    this.debug_ = true;
    this.dht_.OnConnected = ()=> {
      console.log('StorageKVMongo::constructor::OnConnected');
      self.connectDHT_();
    }
    this.dht_.OnDisConnected = ()=> {
      console.log('StorageKVMongo::constructor::OnDisConnected');
    }
    MongoClient.connect(dbURL,connectOption,(err, client)=>{
      //console.log('StorageKVMongo::connect:: err=<',err,'>');
      //console.log('StorageKVMongo::connect:: client=<',client,'>');
      if(!err) {
        self.mongo_ = client;
        self.onMongoCreated_();
      } else {
        console.log('StorageKVMongo::constructor:err=<', err,'>');
      }
    });
  }
  onRemoteMsg(msg) {
    //console.log('StorageKVMongo::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload) {
      if(msg.spread.payload.kv) {
        this.onSpreadMsg_(msg.spread.payload.kv,msg.address,msg.from,msg.spread.payload.tag);
      } else if(msg.spread.payload.kw) {
        // empty...
      } else {
        console.log('StorageKVMongo::onRemoteMsg:: msg=<',msg,'>');
      }
    } else if(msg.delivery && msg.delivery.payload) {
      // empty...
    } else if(msg.loopback) {
      // empty...
    } else {
      console.log('StorageKVMongo::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onSpreadMsg_(kvReq,address,from,tag) {
    //console.log('StorageKVMongo::onSpreadMsg_:: kvReq=<',kvReq,'>');
    //console.log('StorageKVMongo::onSpreadMsg_:: address=<',address,'>');
    if(kvReq.store) {
      this.onStore_(kvReq.store,address,tag)
    } else if (kvReq.fetch) {
      this.onFetch_(kvReq.fetch,address,from,tag);
    } else {
      console.log('StorageKVMongo::onSpreadMsg_:: kvReq=<',kvReq,'>');
    }
  }
  
  async onStore_(content,address,tag) {
    //console.log('StorageKVMongo::onStore_:: content=<',content,'>');
    //console.log('StorageKVMongo::onStore_:: address=<',address,'>');
    //console.log('StorageKVMongo::onStore_:: this.kv_=<',this.kv_,'>');
    const found = await this.kv_.findOne({addr:address});
    //console.log('StorageKVMongo::onStore_:: found=<',found,'>');
    if(found === null) {
      const storedObj = { val :content,addr:address};
      //console.log('StorageKVMongo::onStore_:: storedObj=<',storedObj,'>');
      await this.kv_.insertOne(storedObj);
    }
  }
  
  async onFetch_(fetch,address,from,tag) {
    //console.log('StorageKVMongo::onFetch_:: fetch=<',fetch,'>');
    //console.log('StorageKVMongo::onFetch_:: address=<',address,'>');
    //console.log('StorageKVMongo::onFetch_:: from=<',from,'>');
    //console.log('StorageKVMongo::onFetch_:: this.repos_=<',this.repos_,'>');
    const content = await this.kv_.findOne({addr:address});
    console.log('StorageKVMongo::onFetch_:: content=<',content,'>');
    const deliveryPayload = {
      address:address
    };
    try {
      if(this.debug_) {
        console.log('StorageKVMongo::onFetch_:: address=<',address,'>');
      }
      //console.log('StorageKVMongo::onFetch_:: content=<',content,'>');
      if(content && content.val) {
        deliveryPayload.content = content.val;
      }
    } catch(err) {
      console.log('StorageKVMongo::onFetch_:: err=<',err,'>');
    }
    this.deliveryReply_(deliveryPayload,from,tag);

  }
  deliveryReply_(payload,from,tag) {
    //console.log('StorageKVMongo::deliveryReply_:: payload=<',payload,'>');
    //console.log('StorageKVMongo::deliveryReply_:: from=<',from,'>');
    //console.log('StorageKVMongo::deliveryReply_:: this.id=<',this.id,'>');
    const kvPayload = {kvR:payload,tag:tag};
    if(this.id !== from) {
      this.dht_.delivery(from,kvPayload);
    } else {
      this.dht_.loopback(from,kvPayload);
    }
  }
  
  connectDHT_() {
    const self = this;
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('StorageKVMongo::constructor:: peerInfo=<',peerInfo,'>');
      if(peerInfo.reps && peerInfo.id) {
        self.repos_ = `${peerInfo.reps.dht}/kvalue.store`;
        self.id = peerInfo.id;
      }
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });    
  }
  onMongoCreated_() {
    const kvdb = this.mongo_.db('kv');    
    //console.log('StorageKVMongo::onMongoCreated_:kvdb=<', kvdb,'>');
    this.kv_ = kvdb.collection('keyvalue');
  }
};

const daemon = new StorageKVMongo();
