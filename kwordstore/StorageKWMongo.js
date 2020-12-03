'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const dbURL = `mongodb://%2Fdev%2Fshm%2Fmongodb-27017.sock`;
const connectOption = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}
const iConstItemOfOnce = 16;
class StorageKWMongo {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.stats_ = {};
    this.tagMarks_ = {};
    const self = this;
    this.dht_.OnConnected = ()=> {
      console.log('StorageKWMongo::constructor::OnConnected');
      self.connectDHT_();
    }
    this.dht_.OnDisConnected = ()=> {
      console.log('StorageKWMongo::constructor::OnDisConnected');
    }
    MongoClient.connect(dbURL,connectOption,(err, client)=>{
      //console.log('StorageKWMongo::connect:: err=<',err,'>');
      //console.log('StorageKWMongo::connect:: client=<',client,'>');
      if(!err) {
        self.mongo_ = client;
        self.onMongoCreated_();
      } else {
        console.log('MongoStorage::constructor:err=<', err,'>');
      }
    });    
  }
  onRemoteMsg(msg) {
    //console.log('StorageKWMongo::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload) {
      this.onSpreadMsg_(msg.spread.payload,msg.address,msg.from);
    } else if(msg.delivery && msg.delivery.payload) {
      // empty...
    } else if(msg.loopback) {
      // empty...
    } else {
      console.log('StorageKWMongo::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onSpreadMsg_(payload,address,from) {
    //console.log('StorageKWMongo::onSpreadMsg_:: payload=<',payload,'>');
    //console.log('StorageKWMongo::onSpreadMsg_:: address=<',address,'>');
    if(payload.kw && payload.kw.store) {
      this.onStore_(payload.kw.word,payload.kw.store,payload.kw.rank,address,payload.kw.tag)
    } else if (payload.kw && payload.kw.fetch) {
      this.onFetch_(payload.kw.fetch,address,from,payload.kw.tag);
    } else if (payload.kv) {
      // empty.
    } else {
      console.log('StorageKWMongo::onSpreadMsg_:: payload=<',payload,'>');
    }
  }
  onStore_(word,store,rank,address,tag) {
    //console.log('StorageKWMongo::onStore_:: word=<',word,'>');
    //console.log('StorageKWMongo::onStore_:: store=<',store,'>');
    //console.log('StorageKWMongo::onStore_:: rank=<',rank,'>');
    //console.log('StorageKWMongo::onStore_:: address=<',address,'>');
    const wordAddress = this.getAddress(word);
    //console.log('StorageKWMongo::onStore_:: wordAddress=<',wordAddress,'>');
    if(wordAddress !== address) {
      return;
    }
    const findFilter = {
      res: store,
      add: address,
    };
    this.rank_.findOne(findFilter,(error, document)=>{
      if(error) {
        console.log('StorageKWMongo::onStore_:: error=<',error,'>');
      } else {
        //console.log('StorageKWMongo::onStore_:: document=<',document,'>');
        if(document) {
          //console.log('StorageKWMongo::onStore_:: document=<',document,'>');
          const newvalues = { $set: { rank: rank,at:new Date() } };
          this.rank_.updateOne(findFilter,newvalues);
        } else {
          //console.log('StorageKWMongo::onStore_:: document=<',document,'>');
          const storeObject = {
            word:word,
            res:store,
            rank:rank,
            add:address,
            at:new Date()
          };
          this.rank_.insertOne(storeObject);
        }
      }
    });
  }
  
  async onFetch_(fetch,address,from,tag) {
    //console.log('StorageKWMongo::onFetch_:: fetch=<',fetch,'>');
    //console.log('StorageKWMongo::onFetch_:: address=<',address,'>');
    //console.log('StorageKWMongo::onFetch_:: from=<',from,'>');
    //console.log('StorageKWMongo::onFetch_:: tag=<',tag,'>');
    const findFilter = {
      add: address
    };
    const count = await this.rank_.countDocuments(findFilter);
    //console.log('StorageKWMongo::onFetch_:: count=<',count,'>');
    let itemFromOffset = 0;
    if(fetch.offset > 0) {
      itemFromOffset = fetch.offset;
    }
    //console.log('StorageKWMongo::onFetch_:: itemFromOffset=<',itemFromOffset,'>');
    const findQuery = await this.rank_.find(findFilter).sort({rank:-1})
     .skip(itemFromOffset).limit(iConstItemOfOnce).toArray();
    //console.log('StorageKWMongo::onFetch_:: findQuery=<',findQuery,'>');
    const resources = [];
    for(const found of findQuery) {
      resources.push(found.res);
    }
    const deliveryPayload = {
      offset:itemFromOffset,
      total:count,
      finnish:(itemFromOffset + iConstItemOfOnce > count),
      content:resources
    }
    //console.log('StorageKWMongo::onFetch_:: deliveryPayload=<',deliveryPayload,'>');
    this.deliveryReply_(deliveryPayload,from,tag);
  }
  deliveryReply_(payload,from,tag) {
    if(this.tagMarks_[tag]) {
      return;
    }
    //console.log('StorageKWMongo::deliveryReply_:: payload=<',payload,'>');
    //console.log('StorageKWMongo::deliveryReply_:: from=<',from,'>');
    //console.log('StorageKWMongo::deliveryReply_:: this.id=<',this.id,'>');
    //console.log('StorageKWMongo::deliveryReply_:: tag=<',tag,'>');
    this.tagMarks_[tag] = new Date();
    const kwPayload = {kwR:payload,tag:tag};
    if(this.id !== from) {
      this.dht_.delivery(from,kwPayload);
    } else {
      this.dht_.loopback(from,kwPayload);
    }
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
  
  
  connectDHT_() {
    const self = this;
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('StorageKWMongo::.constructor:: peerInfo=<',peerInfo,'>');
      if(peerInfo.reps && peerInfo.id) {
        self.repos_ = `${peerInfo.reps.dht}/kword.store`;
        self.id = peerInfo.id;
      } else {
        
      }
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });    
  }
  onMongoCreated_() {
    this.kword_ = this.mongo_.db('kword');    
    //console.log('StorageKWMongo::onMongoCreated_:this.kword_=<', this.kword_,'>');
    this.rank_ = this.kword_.collection('rank');
  }
};

const daemon = new StorageKWMongo();
