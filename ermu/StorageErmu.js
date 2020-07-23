'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const level = require('level');

const bs32Option = { type: "crockford", lc: true };
const iConstCacheActiveCount = 100;
const iConstItemOfOnce = 16;

class StorageErmu {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dbs_ = {};
    const self = this;
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('StorageErmu::.constructor:: peerInfo=<',peerInfo,'>');
      self.repos_ = `${peerInfo.reps.dht}/ermu`;
      self.id = peerInfo.id;
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  onRemoteMsg(msg) {
    //console.log('StorageErmu::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload && msg.spread.payload.ermu) {
      this.onErmuSpreadMsg_(msg.spread.payload.ermu,msg.address,msg.from);
    } else if(msg.loopback) {
      // empty...
    } else {
      console.log('StorageErmu::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onErmuSpreadMsg_(ermu,address,from) {
    //console.log('StorageErmu::onErmuSpreadMsg_:: ermu=<',ermu,'>');
    //console.log('StorageErmu::onErmuSpreadMsg_:: address=<',address,'>');
    if(ermu.store) {
      this.onStoreErmu_(ermu.word,ermu.store,ermu.rank,address)
    } else if (ermu.fetch) {
      this.onFetchErmu_(ermu.fetch,address,from);
    } else {
      console.log('StorageErmu::onErmuSpreadMsg_:: ermu=<',ermu,'>');
    }
  }
  onStoreErmu_(word,store,rank,address) {
    //console.log('StorageErmu::onStoreErmu_:: word=<',word,'>');
    //console.log('StorageErmu::onStoreErmu_:: store=<',store,'>');
    //console.log('StorageErmu::onStoreErmu_:: rank=<',rank,'>');
    //console.log('StorageErmu::onErmuSpreadMsg_:: address=<',address,'>');
    const db = this.getResourceDB_(address,rank);
    this.store2Level(db,store,address,rank);
  }
  store2Level(db,store,address,rank) {
    const self = this;
    db.get(store, (err, value) => {
      //console.log('StorageErmu::store2Level:: err=<',err,'>');
      if (err) {
        //console.log('StorageErmu::store2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(store,1);
          self.onUpdateStats(address,rank);
        }
      } else {
        //console.log('StorageErmu::store2Level:: store=<',store,'>');
        //console.log('StorageErmu::store2Level:: value=<',value,'>');
      }
    })
  }
  onUpdateStats(address,rank) {
    console.log('StorageErmu::onUpdateStats:: address=<',address,'>');
    console.log('StorageErmu::onUpdateStats:: rank=<',rank,'>');
    const db = this.getStatsDB_(address);
    this.saveCount2Level(db,rank);
  }
  saveCount2Level(db,rank) {
    db.get(rank, (err, value) => {
      //console.log('StorageErmu::saveCount2Level:: err=<',err,'>');
      if (err) {
        //console.log('StorageErmu::saveCount2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(rank,1);
        }
      } else {
        //console.log('StorageErmu::saveCount2Level:: rank=<',rank,'>');
        //console.log('StorageErmu::saveCount2Level:: value=<',value,'>');
        const oldCount = parseInt(value);
        db.put(rank,oldCount + 1);
      }
    })    
  }
  
  onFetchErmu_(fetch,address,from) {
    //console.log('StorageErmu::onFetchErmu_:: fetch=<',fetch,'>');
    //console.log('StorageErmu::onFetchErmu_:: address=<',address,'>');
    //console.log('StorageErmu::onFetchErmu_:: from=<',from,'>');
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
      //console.log('StorageErmu::fetchStatsFromLevel:: rankCount=<',rankCount,'>');
      self.onFetchErmuResource_(rankCount,fetch,address,from);
    });
  }
  onFetchErmuResource_(rankCount,fetch,address,from) {
    //console.log('StorageErmu::onFetchErmuResource_:: rankCount=<',rankCount,'>');
    rankCount.sort((a,b)=>{return b[0] -a[0]});
    //console.log('StorageErmu::onFetchErmuResource_:: rankCount=<',rankCount,'>');
    //console.log('StorageErmu::onFetchErmuResource_:: fetch=<',fetch,'>');
    //console.log('StorageErmu::onFetchErmuResource_:: address=<',address,'>');
    //console.log('StorageErmu::onFetchErmuResource_:: from=<',from,'>');
    let itemFromOffset = 0;
    if(fetch.offset > 0) {
      itemFromOffset = fetch.offset;
    }
    //console.log('StorageErmu::onFetchErmuResource_:: itemFromOffset=<',itemFromOffset,'>');
    let sumFromHigh = 0;
    let offsetHintRank = false;
    let skipFirstDbCounter = 0;
    const fetchRank = [];
    for(const rank of rankCount) {
      //console.log('StorageErmu::onFetchErmuResource_:: rank=<',rank,'>');
      //console.log('StorageErmu::onFetchErmuResource_:: sumFromHigh=<',sumFromHigh,'>');
      if(sumFromHigh + rank[1] > itemFromOffset && offsetHintRank === false) {
        offsetHintRank = rank[0];
        skipFirstDbCounter = itemFromOffset - sumFromHigh;
      }
      if(offsetHintRank !== false) {
        fetchRank.push(rank[0]);
      }
      sumFromHigh += rank[1];
    }
    //console.log('StorageErmu::onFetchErmuResource_:: sumFromHigh=<',sumFromHigh,'>');
    //console.log('StorageErmu::onFetchErmuResource_:: offsetHintRank=<',offsetHintRank,'>');
    //console.log('StorageErmu::onFetchErmuResource_:: skipFirstDbCounter=<',skipFirstDbCounter,'>');
    const deliveryPayload = {
      offset:itemFromOffset,
      total:sumFromHigh,
      finnish:(itemFromOffset + iConstItemOfOnce > sumFromHigh)
    }
    this.fetchResourceFromLevel(address,fetchRank,skipFirstDbCounter,deliveryPayload,from);
  }
  
  fetchResourceFromLevel(address,fetchRank,skipFirst,payload,from) {
    //console.log('StorageErmu::fetchResourceFromLevel:: fetchRank=<',fetchRank,'>');
    //console.log('StorageErmu::fetchResourceFromLevel:: skipFirst=<',skipFirst,'>');
    let indexRank = 0;
    const resources = []
    const self = this;
    const readResouce = () => {
      if(indexRank < fetchRank.length) {
        const rank = fetchRank[indexRank];
        const db = this.getResourceDB_(address,rank);
        //console.log('StorageErmu::fetchResourceFromLevel:: db=<',db,'>');
        const rs = db.createReadStream();
        rs.on('data', (data) => {
          if(skipFirst <= 0) {
            resources.push(data.key);
            if(resources.length >= iConstItemOfOnce) {
              //console.log('StorageErmu::fetchResourceFromLevel:: resources=<',resources,'>');
              payload.resource = resources;
              self.deliveryReply_(payload,from);
              return;
            }
          }
          skipFirst--;
        });
        rs.on('end', () => {
          if(resources.length >= iConstItemOfOnce) {
            //console.log('StorageErmu::fetchResourceFromLevel:: resources=<',resources,'>');
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
        //console.log('StorageErmu::fetchResourceFromLevel:: resources=<',resources,'>');
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
    //console.log('StorageErmu::deliveryReply_:: payload=<',payload,'>');
    //console.log('StorageErmu::deliveryReply_:: from=<',from,'>');
    //console.log('StorageErmu::deliveryReply_:: this.id=<',this.id,'>');
    if(this.id !== from) {
      this.dht_.delivery(from,payload);
    } else {
      this.dht_.loopback(from,payload);
    }
  }
  
  getResourceDB_(address,rank) {
    const dbDir = `${this.repos_}/${address}/${rank}`;
    //console.log('StorageErmu::getResourceDB_:: dbDir=<',dbDir,'>');
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

const daemon = new StorageErmu();
