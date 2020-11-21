'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const level = require('level');


const { MongoClient } = require('mongodb');


const username = encodeURIComponent('EBWzun82iVjW');
const password = encodeURIComponent('RNQCeZn2aqqR');
const authMechanism = 'DEFAULT';
const dbURL = `mongodb://%2Fdev%2Fshm%2Fmongodb-27017.sock`;
const connectOption = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

/*
const username = encodeURIComponent('tYm0IdZ2');
const password = encodeURIComponent('hy8YXhln');
const authMechanism = "DEFAULT";
const dbURL = `mongodb://${username}:${password}@localhost:27017/?Mechanism=${authMechanism}`;
const connectOption = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}
*/
MongoClient.connect(dbURL,connectOption,(err, client)=>{
  console.log('StorageKWMongo::connect:: err=<',err,'>');
  console.log('StorageKWMongo::connect:: client=<',client,'>');
  if(!err) {
    self.client_ = client;
    self.onClientCreated_();
  } else {
    console.log('MongoStorage::constructor:err=<', err,'>');
  }
});
    
/*

const iConstCacheActiveCount = 10;
const iConstCacheMaxSize = 1024;
const iConstItemOfOnce = 16;

class StorageKWMongo {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dbs_ = {};
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
    setInterval(()=>{
      self.CheckCachedHandler_();
    },1000*10);
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
    const db = this.getResourceDB_(address,rank);
    this.store2Level(db,store,address,rank);
  }
  async store2Level(db,store,address,rank) {
    const self = this;
    if(db.isOpen() === false) {
      console.log('StorageKWMongo::store2Level:: db.isOpen()=<',db.isOpen(),'>');
    } else {
      console.log('StorageKWMongo::store2Level:: db.isOpen()=<',db.isOpen(),'>');
    }
    try {
      await db.get(store);
    } catch(err) {
      if (err.notFound) {
        await db.put(store,1);
        self.onUpdateStats(address,rank);
      }
    }
  }
  onUpdateStats(address,rank) {
    console.log('StorageKWMongo::onUpdateStats:: address=<',address,'>');
    console.log('StorageKWMongo::onUpdateStats:: rank=<',rank,'>');
    try {
      if(!this.stats_[address]) {
        this.stats_[address] = require(`${this.repos_}/${address}/stats.json`);
      }
    } catch(e) {
      this.stats_[address] = {};
    }
    const rankIndex = rank.toString();
    if(this.stats_[address][rankIndex]) {
      this.stats_[address][rankIndex] += 1;
    } else {
      this.stats_[address][rankIndex] = 1;
    }
    fs.writeFileSync(`${this.repos_}/${address}/stats.json`,JSON.stringify(this.stats_[address]));
  }
  
  async onFetch_(fetch,address,from,tag) {
    //console.log('StorageKWMongo::onFetch_:: fetch=<',fetch,'>');
    //console.log('StorageKWMongo::onFetch_:: address=<',address,'>');
    //console.log('StorageKWMongo::onFetch_:: from=<',from,'>');
    //console.log('StorageKWMongo::onFetch_:: tag=<',tag,'>');
    try {
      if(!this.stats_[address]) {
        this.stats_[address] = require(`${this.repos_}/${address}/stats.json`);
      }
    } catch(err) {
      console.log('StorageKWMongo::onFetch_:: err=<',err,'>');
      this.stats_[address] = {};
    }
    const rankCount = [];
    for(const rankIndex in this.stats_[address]) {
      rankCount.push([parseInt(rankIndex),this.stats_[address][rankIndex]])
    }
    this.onFetchResource_(rankCount,fetch,address,from,tag);
  }
  onFetchResource_(rankCount,fetch,address,from,tag) {
    //console.log('StorageKWMongo::onFetchResource_:: rankCount=<',rankCount,'>');
    rankCount.sort((a,b)=>{return b[0] -a[0]});
    //console.log('StorageKWMongo::onFetchResource_:: rankCount=<',rankCount,'>');
    //console.log('StorageKWMongo::onFetchResource_:: fetch=<',fetch,'>');
    //console.log('StorageKWMongo::onFetchResource_:: address=<',address,'>');
    //console.log('StorageKWMongo::onFetchResource_:: from=<',from,'>');
    let itemFromOffset = 0;
    if(fetch.offset > 0) {
      itemFromOffset = fetch.offset;
    }
    //console.log('StorageKWMongo::onFetchResource_:: itemFromOffset=<',itemFromOffset,'>');
    let sumFromHigh = 0;
    let offsetHintRank = false;
    let skipFirstDbCounter = 0;
    const fetchRank = [];
    for(const rank of rankCount) {
      //console.log('StorageKWMongo::onFetchResource_:: rank=<',rank,'>');
      //console.log('StorageKWMongo::onFetchResource_:: sumFromHigh=<',sumFromHigh,'>');
      if(sumFromHigh + rank[1] > itemFromOffset && offsetHintRank === false) {
        offsetHintRank = rank[0];
        skipFirstDbCounter = itemFromOffset - sumFromHigh;
      }
      if(offsetHintRank !== false) {
        fetchRank.push(rank[0]);
      }
      sumFromHigh += rank[1];
    }
    //console.log('StorageKWMongo::onFetchResource_:: sumFromHigh=<',sumFromHigh,'>');
    //console.log('StorageKWMongo::onFetchResource_:: offsetHintRank=<',offsetHintRank,'>');
    //console.log('StorageKWMongo::onFetchResource_:: skipFirstDbCounter=<',skipFirstDbCounter,'>');
    const deliveryPayload = {
      offset:itemFromOffset,
      total:sumFromHigh,
      finnish:(itemFromOffset + iConstItemOfOnce > sumFromHigh)
    }
    this.fetchResourceFromLevel(address,fetchRank,skipFirstDbCounter,deliveryPayload,from,tag);
  }
  
  fetchResourceFromLevel(address,fetchRank,skipFirst,payload,from,tag) {
    //console.log('StorageKWMongo::fetchResourceFromLevel:: fetchRank=<',fetchRank,'>');
    //console.log('StorageKWMongo::fetchResourceFromLevel:: skipFirst=<',skipFirst,'>');
    let indexRank = 0;
    const resources = []
    const self = this;
    const readResouce = () => {
      if(indexRank < fetchRank.length) {
        const rank = fetchRank[indexRank];
        const db = this.getResourceDB_(address,rank);
        //console.log('StorageKWMongo::fetchResourceFromLevel:: db=<',db,'>');
        const rs = db.createReadStream();
        rs.on('data', (data) => {
          if(skipFirst <= 0) {
            resources.push(data.key);
            if(resources.length >= iConstItemOfOnce) {
              //console.log('StorageKWMongo::fetchResourceFromLevel:: resources=<',resources,'>');
              payload.content = resources;
              self.deliveryReply_(payload,from,tag);
              return;
            }
          }
          skipFirst--;
        });
        rs.on('end', () => {
          if(resources.length >= iConstItemOfOnce) {
            //console.log('StorageKWMongo::fetchResourceFromLevel:: resources=<',resources,'>');
            payload.content = resources;
            self.deliveryReply_(payload,from,tag);
            return;
          }
          indexRank++;
          setTimeout(()=>{
            readResouce();
          },0)
        })
      } else {
        //console.log('StorageKWMongo::fetchResourceFromLevel:: resources=<',resources,'>');
        payload.content = resources;
        self.deliveryReply_(payload,from,tag);
        return;
      }
    }
    setTimeout(()=>{
      readResouce();
    },0)
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
  
  getResourceDB_(address,rank) {
    const dbDir = `${this.repos_}/${address}/${rank}`;
    //console.log('StorageKWMongo::getResourceDB_:: dbDir=<',dbDir,'>');
    if(!fs.existsSync(dbDir)){
      fs.mkdirSync(dbDir,{recursive :true});
    }
    const dbIndex =  `${address}/${rank}`;
    //console.log('StorageKWMongo::getResourceDB_:: this.dbs_=<',this.dbs_,'>');
    if(this.dbs_[dbIndex]) {
      const db = this.dbs_[dbIndex].db;
      this.dbs_[dbIndex].count = iConstCacheActiveCount;
      return db;
    } else {
      const dbPath = `${dbDir}/store.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      db.on('ready',()=>{
        console.log('StorageKWMongo::getResourceDB_::ready!!!>');
      });
      return db;
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
  CheckCachedHandler_() {
    const dbIndexs = Object.keys(this.dbs_);
    //console.log('StorageKWMongo::CheckCachedHandler_:: dbIndexs.length=<',dbIndexs.length,'>');
    let clearOld = false;
    if(dbIndexs.length > iConstCacheMaxSize) {
      clearOld = true;
    }
    for(const dbIndex of dbIndexs) {
      //console.log('StorageKWMongo::CheckCachedHandler_:: dbIndex=<',dbIndex,'>');
      const dbStats = this.dbs_[dbIndex];
      //console.log('StorageKWMongo::CheckCachedHandler_:: dbStats.count=<',dbStats.count,'>');
      dbStats.count--;
      if(clearOld && dbStats.count < 0) {
        delete this.dbs_[dbIndex];
      }
    }
    const tagIndexs = Object.keys(this.tagMarks_);
    const now = new Date();
    for(const tagIndex of tagIndexs) {
      const tagDate = this.tagMarks_[tagIndex];
      const escape_ms = now - tagDate;
      if(escape_ms > 100) {
        //console.log('StorageKWMongo::CheckCachedHandler_:: escape_ms=<',escape_ms,'>');
        delete this.tagMarks_[tagIndex];
      }
    }
    //console.log('StorageKWMongo::CheckCachedHandler_:: this.tagMarks_=<',this.tagMarks_,'>');
  }
};

const daemon = new StorageKWMongo();
*/