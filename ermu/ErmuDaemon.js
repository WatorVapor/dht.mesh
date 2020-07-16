'use strict';
const DHTClient = require('../api/DHTClient.js');
const DHTUtils = require('../api/DHTUtils.js');
const fs = require('fs');
const level = require('level');

const bs32Option = { type: "crockford", lc: true };
const iConstCacheActiveCount = 100;

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
      this.onErmuSpreadMsg_(msg.spread.payload.ermu,msg.address);
    } else {
      console.log('ErmuDaemon::onRemoteMsg:: msg=<',msg,'>');
    }
  }
  onErmuSpreadMsg_(ermu,address) {
    //console.log('ErmuDaemon::onErmuSpreadMsg_:: ermu=<',ermu,'>');
    //console.log('ErmuDaemon::onErmuSpreadMsg_:: address=<',address,'>');
    if(ermu.store) {
      this.onStoreErmu_(ermu.word,ermu.store,ermu.rank,address)
    } else if (ermu.fetch) {
      this.onFetchErmu_(ermu.fetch,address);
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
      this.onStore2Level(db,store,address,rank);
    } else {
      const dbPath = `${dbDir}/store.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      this.onStore2Level(db,store,address,rank);
    }
  }
  onStore2Level(db,store,address,rank) {
    const self = this;
    db.get(store, (err, value) => {
      //console.log('ErmuDaemon::onStore2Level:: err=<',err,'>');
      if (err) {
        //console.log('ErmuDaemon::onStore2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(store,1);
          self.onUpdateStats(address,rank);
        }
      } else {
        //console.log('ErmuDaemon::onStore2Level:: store=<',store,'>');
        //console.log('ErmuDaemon::onStore2Level:: value=<',value,'>');
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
      this.onCount2Level(db,rank);
    } else {
      const dbPath = `${this.repos_}/${address}/stats.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      this.onCount2Level(db,rank);
    }
  }
  onCount2Level(db,rank) {
    db.get(rank, (err, value) => {
      //console.log('ErmuDaemon::onCount2Level:: err=<',err,'>');
      if (err) {
        //console.log('ErmuDaemon::onCount2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(rank,1);
        }
      } else {
        //console.log('ErmuDaemon::onCount2Level:: rank=<',rank,'>');
        //console.log('ErmuDaemon::onCount2Level:: value=<',value,'>');
        const oldCount = parseInt(value);
        db.put(rank,oldCount + 1);
      }
    })    
  }
  
  onFetchErmu_(fetch,address) {
    console.log('ErmuDaemon::onFetchErmu_:: fetch=<',fetch,'>');
    console.log('ErmuDaemon::onFetchErmu_:: address=<',address,'>');
  }

  getAddress(content) {
    return this.utils_.calcAddress(content);
  }
};

const daemon = new ErmuDaemon();
