'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const level = require('level');

const bs32Option = { type: "crockford", lc: true };
const iConstCacheActiveCount = 100;
const iConstItemOfOnce = 16;

class StorageKW {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dbs_ = {};
    const self = this;
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('StorageKW::.constructor:: peerInfo=<',peerInfo,'>');
      self.repos_ = `${peerInfo.reps.dht}/kword.store`;
      self.id = peerInfo.id;
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  onRemoteMsg(msg) {
    //console.log('StorageKW::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload) {
      this.onSpreadMsg_(msg.spread.payload,msg.address,msg.from);
    } else if(msg.delivery && msg.delivery.payload) {
      // empty...
    } else if(msg.loopback) {
      // empty...
    } else {
      console.log('StorageKW::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onSpreadMsg_(payload,address,from) {
    //console.log('StorageKW::onSpreadMsg_:: payload=<',payload,'>');
    //console.log('StorageKW::onSpreadMsg_:: address=<',address,'>');
    if(payload.kw && payload.kw.store) {
      this.onStore_(payload.kw.word,payload.kw.store,payload.kw.rank,address)
    } else if (payload.kw && payload.kw.fetch) {
      this.onFetch_(payload.kw.fetch,address,from);
    } else {
      console.log('StorageKW::onSpreadMsg_:: payload=<',payload,'>');
    }
  }
  onStore_(word,store,rank,address) {
    //console.log('StorageKW::onStore_:: word=<',word,'>');
    console.log('StorageKW::onStore_:: store=<',store,'>');
    //console.log('StorageKW::onStore_:: rank=<',rank,'>');
    //console.log('StorageKW::onStore_:: address=<',address,'>');
    const db = this.getResourceDB_(address,rank);
    this.store2Level(db,store,address,rank);
  }
  store2Level(db,store,address,rank) {
    const self = this;
    db.get(store, (err, value) => {
      //console.log('StorageKW::store2Level:: err=<',err,'>');
      if (err) {
        //console.log('StorageKW::store2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(store,1);
          self.onUpdateStats(address,rank);
        }
      } else {
        //console.log('StorageKW::store2Level:: store=<',store,'>');
        //console.log('StorageKW::store2Level:: value=<',value,'>');
      }
    })
  }
  onUpdateStats(address,rank) {
    console.log('StorageKW::onUpdateStats:: address=<',address,'>');
    console.log('StorageKW::onUpdateStats:: rank=<',rank,'>');
    const db = this.getStatsDB_(address);
    this.saveCount2Level(db,rank);
  }
  saveCount2Level(db,rank) {
    db.get(rank, (err, value) => {
      //console.log('StorageKW::saveCount2Level:: err=<',err,'>');
      if (err) {
        //console.log('StorageKW::saveCount2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(rank,1);
        }
      } else {
        //console.log('StorageKW::saveCount2Level:: rank=<',rank,'>');
        //console.log('StorageKW::saveCount2Level:: value=<',value,'>');
        const oldCount = parseInt(value);
        db.put(rank,oldCount + 1);
      }
    })    
  }
  
  onFetch_(fetch,address,from) {
    //console.log('StorageKW::onFetch_:: fetch=<',fetch,'>');
    //console.log('StorageKW::onFetch_:: address=<',address,'>');
    //console.log('StorageKW::onFetch_:: from=<',from,'>');
    const db = this.getStatsDB_(address);
    this.fetchStatsFromLevel(db,fetch,address,from);
  }
  fetchStatsFromLevel(db,fetch,address,from) {
    const vStream = db.createReadStream();
    const rankCount = [];
    const self = this;
    vStream.on('data', (data) => {
      rankCount.push([parseInt(data.key),parseInt(data.value)]);
    });
    vStream.on('end', (data) => {
      //console.log('StorageKW::fetchStatsFromLevel:: rankCount=<',rankCount,'>');
      self.onFetchResource_(rankCount,fetch,address,from);
    });
  }
  onFetchResource_(rankCount,fetch,address,from) {
    //console.log('StorageKW::onFetchResource_:: rankCount=<',rankCount,'>');
    rankCount.sort((a,b)=>{return b[0] -a[0]});
    //console.log('StorageKW::onFetchResource_:: rankCount=<',rankCount,'>');
    //console.log('StorageKW::onFetchResource_:: fetch=<',fetch,'>');
    //console.log('StorageKW::onFetchResource_:: address=<',address,'>');
    //console.log('StorageKW::onFetchResource_:: from=<',from,'>');
    let itemFromOffset = 0;
    if(fetch.offset > 0) {
      itemFromOffset = fetch.offset;
    }
    //console.log('StorageKW::onFetchResource_:: itemFromOffset=<',itemFromOffset,'>');
    let sumFromHigh = 0;
    let offsetHintRank = false;
    let skipFirstDbCounter = 0;
    const fetchRank = [];
    for(const rank of rankCount) {
      //console.log('StorageKW::onFetchResource_:: rank=<',rank,'>');
      //console.log('StorageKW::onFetchResource_:: sumFromHigh=<',sumFromHigh,'>');
      if(sumFromHigh + rank[1] > itemFromOffset && offsetHintRank === false) {
        offsetHintRank = rank[0];
        skipFirstDbCounter = itemFromOffset - sumFromHigh;
      }
      if(offsetHintRank !== false) {
        fetchRank.push(rank[0]);
      }
      sumFromHigh += rank[1];
    }
    //console.log('StorageKW::onFetchResource_:: sumFromHigh=<',sumFromHigh,'>');
    //console.log('StorageKW::onFetchResource_:: offsetHintRank=<',offsetHintRank,'>');
    //console.log('StorageKW::onFetchResource_:: skipFirstDbCounter=<',skipFirstDbCounter,'>');
    const deliveryPayload = {
      offset:itemFromOffset,
      total:sumFromHigh,
      finnish:(itemFromOffset + iConstItemOfOnce > sumFromHigh)
    }
    this.fetchResourceFromLevel(address,fetchRank,skipFirstDbCounter,deliveryPayload,from);
  }
  
  fetchResourceFromLevel(address,fetchRank,skipFirst,payload,from) {
    //console.log('StorageKW::fetchResourceFromLevel:: fetchRank=<',fetchRank,'>');
    //console.log('StorageKW::fetchResourceFromLevel:: skipFirst=<',skipFirst,'>');
    let indexRank = 0;
    const resources = []
    const self = this;
    const readResouce = () => {
      if(indexRank < fetchRank.length) {
        const rank = fetchRank[indexRank];
        const db = this.getResourceDB_(address,rank);
        //console.log('StorageKW::fetchResourceFromLevel:: db=<',db,'>');
        const rs = db.createReadStream();
        rs.on('data', (data) => {
          if(skipFirst <= 0) {
            resources.push(data.key);
            if(resources.length >= iConstItemOfOnce) {
              //console.log('StorageKW::fetchResourceFromLevel:: resources=<',resources,'>');
              payload.resource = resources;
              self.deliveryReply_(payload,from);
              return;
            }
          }
          skipFirst--;
        });
        rs.on('end', () => {
          if(resources.length >= iConstItemOfOnce) {
            //console.log('StorageKW::fetchResourceFromLevel:: resources=<',resources,'>');
            payload.resource = resources;
            self.deliveryReply_(payload,from);
            return;
          }
          indexRank++;
          setTimeout(()=>{
            readResouce();
          },0)
        })
      } else {
        //console.log('StorageKW::fetchResourceFromLevel:: resources=<',resources,'>');
        payload.resource = resources;
        self.deliveryReply_(payload,from);
        return;
      }
    }
    setTimeout(()=>{
      readResouce();
    },0)
  }
  deliveryReply_(payload,from) {
    //console.log('StorageKW::deliveryReply_:: payload=<',payload,'>');
    //console.log('StorageKW::deliveryReply_:: from=<',from,'>');
    //console.log('StorageKW::deliveryReply_:: this.id=<',this.id,'>');
    const kwPayload = {kwR:payload};
    if(this.id !== from) {
      this.dht_.delivery(from,kwPayload);
    } else {
      this.dht_.loopback(from,kwPayload);
    }
  }
  
  getResourceDB_(address,rank) {
    const dbDir = `${this.repos_}/${address}/${rank}`;
    //console.log('StorageKW::getResourceDB_:: dbDir=<',dbDir,'>');
    if(!fs.existsSync(dbDir)){
      fs.mkdirSync(dbDir,{recursive :true});
    }
    const dbIndex =  `${address}/${rank}`;
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
  getStatsDB_(address) {
     const dbIndex =  `${address}`;
    if(this.dbs_[dbIndex]) {
      const db = this.dbs_[dbIndex].db;
      this.dbs_[dbIndex].count = iConstCacheActiveCount;
      return db;
    } else {
      const dbPath = `${this.repos_}/${address}/stats.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      return db;
    }
  }
 

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
};

const daemon = new StorageKW();
