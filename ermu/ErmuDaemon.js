'use strict';
const DHTClient = require('../api/DHTClient.js');
const CryptoJS = require('crypto-js');
const base32 = require('base32.js');
const fs = require('fs');
const level = require('level');

const bs32Option = { type: "crockford", lc: true };

class ErmuDaemon {
  constructor() {
    this.dht = new DHTClient();
    const self = this;
    this.dht.peerInfo( (peerInfo)=> {
      console.log('ErmuDaemon::.constructor:: peerInfo=<',peerInfo,'>');
      self.repos_ = `${peerInfo.reps.dht}/ermu`;
    });
    this.dht.subscribe( ( remoteMsg ) => {
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
      
    } else {
      
    }
  }
  onStoreErmu_(word,store,rank,address) {
    console.log('ErmuDaemon::onStoreErmu_:: word=<',word,'>');
    console.log('ErmuDaemon::onStoreErmu_:: store=<',store,'>');
    console.log('ErmuDaemon::onStoreErmu_:: rank=<',rank,'>');
    console.log('ErmuDaemon::onErmuSpreadMsg_:: address=<',address,'>');
    const dbDir = `${this.repos_}/${address}/${rank}`;
    console.log('ErmuDaemon::onStoreErmu_:: dbDir=<',dbDir,'>');
    fs.mkdirSync(dbDir,{recursive :true});
    
  }
  getAddress(content) {
    const contentRipemd = CryptoJS.RIPEMD160(content).toString(CryptoJS.enc.Hex);
    //console.log('ErmuClient::getAddress:: contentRipemd=<',contentRipemd,'>');
    const contentBuffer = Buffer.from(contentRipemd,'hex');
    return base32.encode(contentBuffer,bs32Option);
  }
};

const daemon = new ErmuDaemon();
