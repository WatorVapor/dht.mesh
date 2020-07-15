'use strict';
const DHTClient = require('../api/DHTClient.js');
const CryptoJS = require('crypto-js');
const base32 = require('base32.js');
const fs = require('fs');
const level = require('level');

const bs32Option = { type: "crockford", lc: true };
const iConstCacheActiveCount = 100;

class ErmuDaemon {
  constructor() {
    this.dht_ = new DHTClient();
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
      this.onFetchErmu_(address);
    } else {
      
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
      this.onSave2Level(db,store);
    } else {
      const dbPath = `${dbDir}/store.level`;
      const db = level(dbPath);
      this.dbs_[dbIndex] = { db:db,count:iConstCacheActiveCount};
      this.onSave2Level(db,store);
    }
  }
  onSave2Level(db,store,address) {
    const self = this;
    db.get(store, (err, value) => {
      //console.log('ErmuDaemon::onSave2Level:: err=<',err,'>');
      if (err) {
        //console.log('ErmuDaemon::onSave2Level:: err=<',err,'>');
        if (err.notFound) {
          db.put(store,1);
        }
      } else {
        //console.log('ErmuDaemon::onSave2Level:: store=<',store,'>');
        //console.log('ErmuDaemon::onSave2Level:: value=<',value,'>');
      }
    })
  }
  
  onFetchErmu_(address) {
    console.log('ErmuDaemon::onFetchErmu_:: address=<',address,'>');
  }

  
  getAddress(content) {
    const contentsSha3 = CryptoJS.SHA3(content).toString(CryptoJS.enc.Hex);
    const contentRipemd = CryptoJS.RIPEMD160(contentsSha3).toString(CryptoJS.enc.Hex);
    //console.log('ErmuClient::getAddress:: contentRipemd=<',contentRipemd,'>');
    const contentBuffer = Buffer.from(contentRipemd,'hex');
    return base32.encode(contentBuffer,bs32Option);
  }
};

const daemon = new ErmuDaemon();
