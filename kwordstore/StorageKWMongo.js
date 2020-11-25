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
      store: store,
      address: address,
    };
    this.rank_.findOne(findFilter,(error, document)=>{
      if(error) {
        console.log('StorageKWMongo::onStore_:: error=<',error,'>');
      } else {
        //console.log('StorageKWMongo::onStore_:: document=<',document,'>');
        if(document._id) {
          //console.log('StorageKWMongo::onStore_:: document=<',document,'>');
          const newvalues = { $set: { rank: rank,at:new Date() } };
          this.rank_.updateOne(findFilter,newvalues);
        } else {
          //console.log('StorageKWMongo::onStore_:: document=<',document,'>');
          const storeObject = {
            word:word,
            store:store,
            rank:rank,
            address:address,
            at:new Date()
          };
          this.rank_.insertOne(storeObject);
        }
      }
    });
  }
  
  async onFetch_(fetch,address,from,tag) {
    console.log('StorageKWMongo::onFetch_:: fetch=<',fetch,'>');
    console.log('StorageKWMongo::onFetch_:: address=<',address,'>');
    console.log('StorageKWMongo::onFetch_:: from=<',from,'>');
    console.log('StorageKWMongo::onFetch_:: tag=<',tag,'>');
    const findFilter = {
      address: address
    };
    const query = await this.rank_.count(findFilter);
    console.log('StorageKWMongo::onFetch_:: query=<',query,'>');
    /*
    this.rank_.find(findFilter).toArray((error, documents)=>{
      if(error) {
        console.log('StorageKWMongo::onStore_:: error=<',error,'>');
      } else {
        console.log('StorageKWMongo::onStore_:: documents=<',documents,'>');
      }
    });
    */

    /*
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
    */
  }
  /*
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
  */
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
  
  /*
  
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
  */

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
  /*
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
  */
  onMongoCreated_() {
    this.kword_ = this.mongo_.db('kword');    
    //console.log('StorageKWMongo::onMongoCreated_:this.kword_=<', this.kword_,'>');
    this.rank_ = this.kword_.collection('rank');
  }
};

const daemon = new StorageKWMongo();
