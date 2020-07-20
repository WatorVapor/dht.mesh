'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const level = require('level');

const bs32Option = { type: "crockford", lc: true };
const iConstCacheActiveCount = 100;
const iConstItemOfOnce = 3;

class ErmuDaemon {
  constructor() {
    this.dht_ = new DHTClient();
    this.utils_ = new DHTUtils();
    this.dbs_ = {};
    const self = this;
    this.dht_.peerInfo( (peerInfo)=> {
      console.log('ErmuDaemon::.constructor:: peerInfo=<',peerInfo,'>');
      self.repos_ = `${peerInfo.reps.dht}/ermu`;
    });
    this.dht_.subscribe( ( remoteMsg ) => {
      self.onRemoteMsg(remoteMsg);
    });
  }
  onRemoteMsg(msg) {
    //console.log('ErmuDaemon::onRemoteMsg:: msg=<',msg,'>');
    if(msg.spread && msg.spread.payload && msg.spread.payload.ermu) {
      this.onErmuSpreadMsg_(msg.spread.payload.ermu,msg.address,msg.from);
    } else {
      console.log('ErmuDaemon::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onErmuSpreadMsg_(ermu,address,from) {
    //console.log('ErmuDaemon::onErmuSpreadMsg_:: ermu=<',ermu,'>');
    //console.log('ErmuDaemon::onErmuSpreadMsg_:: address=<',address,'>');
    if(ermu.store) {
      this.onStoreErmu_(ermu.word,ermu.store,ermu.rank,address)
    } else if (ermu.fetch) {
      this.onFetchErmu_(ermu.fetch,address,from);
    } else {
      console.log('ErmuDaemon::onErmuSpreadMsg_:: ermu=<',ermu,'>');
    }
  }
  onStoreErmu_(word,store,rank,address) {
    //console.log('ErmuDaemon::onStoreErmu_:: word=<',word,'>');
    //console.log('ErmuDaemon::onStoreErmu_:: store=<',store,'>');
    //console.log('ErmuDaemon::onStoreErmu_:: rank=<',rank,'>');
    //console.log('ErmuDaemon::onErmuSpreadMsg_:: address=<',address,'>');
    const dbDir = `${this.repos_}/${address}/${rank}`;
    //console.log('ErmuDaemon::onStoreErmu_:: dbDir=<',dbDir,'>');
    fs.mkdirSync(dbDir,{recursive :true});
    const dbIndex =  `${address}/${rank}`;
    if(this.dbs_[dbIndex]) {
      const db = this.dbs_[dbIndex].db;
      this.dbs_[dbIndex].count = iConstCacheActiveCount;
      this.store2Level(db,store,address,rank);
    } else {
      const dbPath = `${dbDir}/store.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      this.store2Level(db,store,address,rank);
    }
  }
  store2Level(db,store,address,rank) {
    const self = this;
    db.get(store, (err, value) => {
      //console.log('ErmuDaemon::store2Level:: err=<',err,'>');
      if (err) {
        //console.log('ErmuDaemon::store2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(store,1);
          self.onUpdateStats(address,rank);
        }
      } else {
        //console.log('ErmuDaemon::store2Level:: store=<',store,'>');
        //console.log('ErmuDaemon::store2Level:: value=<',value,'>');
      }
    })
  }
  onUpdateStats(address,rank) {
    console.log('ErmuDaemon::onUpdateStats:: address=<',address,'>');
    console.log('ErmuDaemon::onUpdateStats:: rank=<',rank,'>');
    const dbIndex =  `${address}`;
    if(this.dbs_[dbIndex]) {
      const db = this.dbs_[dbIndex].db;
      this.dbs_[dbIndex].count = iConstCacheActiveCount;
      this.saveCount2Level(db,rank);
    } else {
      const dbPath = `${this.repos_}/${address}/stats.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      this.saveCount2Level(db,rank);
    }
  }
  saveCount2Level(db,rank) {
    db.get(rank, (err, value) => {
      //console.log('ErmuDaemon::saveCount2Level:: err=<',err,'>');
      if (err) {
        //console.log('ErmuDaemon::saveCount2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(rank,1);
        }
      } else {
        //console.log('ErmuDaemon::saveCount2Level:: rank=<',rank,'>');
        //console.log('ErmuDaemon::saveCount2Level:: value=<',value,'>');
        const oldCount = parseInt(value);
        db.put(rank,oldCount + 1);
      }
    })    
  }
  
  onFetchErmu_(fetch,address,from) {
    //console.log('ErmuDaemon::onFetchErmu_:: fetch=<',fetch,'>');
    //console.log('ErmuDaemon::onFetchErmu_:: address=<',address,'>');
    //console.log('ErmuDaemon::onFetchErmu_:: from=<',from,'>');
    const dbIndex =  `${address}`;
    if(this.dbs_[dbIndex]) {
      const db = this.dbs_[dbIndex].db;
      this.dbs_[dbIndex].count = iConstCacheActiveCount;
      this.fetchStatsFromLevel(db,fetch,address,from);
    } else {
      const dbPath = `${this.repos_}/${address}/stats.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      this.fetchStatsFromLevel(db,fetch,address,from);
    }
  }
  fetchStatsFromLevel(db,fetch,address,from) {
    const vStream = db.createReadStream();
    const rankCount = {};
    const self = this;
    vStream.on('data', (data) => {
      rankCount[data.key] = parseInt(data.value);
    });
    vStream.on('end', (data) => {
      //console.log('ErmuDaemon::fetchStatsFromLevel:: rankCount=<',rankCount,'>');
      self.onFetchErmuResource_(rankCount,fetch,address,from);
    });
  }
  onFetchErmuResource_(stats,fetch,address,from) {
    console.log('ErmuDaemon::onFetchErmuResource_:: stats=<',stats,'>');
    //console.log('ErmuDaemon::onFetchErmuResource_:: fetch=<',fetch,'>');
    //console.log('ErmuDaemon::onFetchErmuResource_:: address=<',address,'>');
    //console.log('ErmuDaemon::onFetchErmuResource_:: from=<',from,'>');
    let itemFromOffset = 0;
    if(fetch.offset > 0) {
      itemFromOffset = fetch.offset;
    }
    console.log('ErmuDaemon::onFetchErmuResource_:: itemFromOffset=<',itemFromOffset,'>');
    let sumFromHigh = 0;
    let offsetHintRank = false;
    let skipFirstDbCounter = 0;
    const keysStats = Object.keys(stats).reverse();
    for(const rankIndex of keysStats) {
      //console.log('ErmuDaemon::onFetchErmuResource_:: rankIndex=<',rankIndex,'>');
      //console.log('ErmuDaemon::onFetchErmuResource_:: sumFromHigh=<',sumFromHigh,'>');
      if(sumFromHigh + stats[rankIndex] > itemFromOffset && offsetHintRank === false) {
        offsetHintRank = rankIndex;
        skipFirstDbCounter = itemFromOffset - sumFromHigh;
      }
      sumFromHigh += stats[rankIndex];
    }
    console.log('ErmuDaemon::onFetchErmuResource_:: sumFromHigh=<',sumFromHigh,'>');
    console.log('ErmuDaemon::onFetchErmuResource_:: offsetHintRank=<',offsetHintRank,'>');
    console.log('ErmuDaemon::onFetchErmuResource_:: skipFirstDbCounter=<',skipFirstDbCounter,'>');
  }
  

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
};

const daemon = new ErmuDaemon();
