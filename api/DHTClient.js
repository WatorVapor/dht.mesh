'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const crypto = require('crypto');
const base32 = require("base32.js");
const CryptoJS = require('crypto-js');
const bs32Option = { type: "crockford", lc: true };
const https = require('https');
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const DefaultDaemonListenChannel = 'dht.mesh.api.daemon.listen';
const iConstMaxResultsOnce = 20;


class DHTClient {
  constructor(daemonChannel) {
    console.log('DHTClient::constructor');
    if(daemonChannel) {
      this.daemonChannel_ = daemonChannel;
    } else {
      this.daemonChannel_ = DefaultDaemonListenChannel;
    }
    this.apiChannel_ = this.calcCallBackHash_(this);
    this.subscriber_ = redis.createClient(redisOption);
    this.subscriber_.subscribe(this.apiChannel_);    
    const self = this;
     this.subscriber_.on('message',(channel,message) => {
      self.onMsg_(message);
    });
    this.publisher_ = redis.createClient(redisOption);   
    this.cb_ = {};
  }
  peerInfo(cb) {
    console.log('DHTClient::peerInfo');
    const msg = {peerInfo:'get'};
    const cbTag = this.writeData_(msg);
    this.cb_[cbTag] = cb;
  }
  push(msg,cb) {
    //console.log('DHTClient::push msg=<',msg,'>');
    const msgMesh = {
      mesh:msg
    };
    const cbTag = this.writeData_(msgMesh);
    this.cb_[cbTag] = cb;
  }

  
  onError_(err) {
    console.log('DHTClient::onError_ err=<',err,'>');
  }
  onMsg_(msg) {
    //console.log('DHTClient::onMsg_ msg=<',msg.toString('utf-8'),'>');
    try {
      const jMsg = JSON.parse(msg.toString());
      //console.log('DHTClient::onMsg_ jMsg=<',jMsg,'>');
      if(jMsg) {
        if(jMsg.peerInfo) {
          this.onPeerInfo_(jMsg);
        } else if(jMsg.mesh) {
          this.onMeshMsg_(jMsg);
        } else {
          console.log('DHTClient::onMsg_ jMsg=<',jMsg,'>');
        }
      } else {
        console.log('DHTClient::onMsg_ jMsg=<',jMsg,'>');
      }
    } catch(e) {
      console.log('DaemonRedis::onMsg_::::e=<',e,'>');
    }
  }
  writeData_(msg) {
    const cbtag = this.calcCallBackHash_(msg);
    msg.cb = cbtag;
    msg.channel = this.apiChannel_;
    const msgBuff = Buffer.from(JSON.stringify(msg),'utf-8');
    try {
      this.publisher_.publish(this.daemonChannel_,msgBuff);
    } catch (e) {
      console.log('writeData_::fetch e=<',e,'>');
    }
    return cbtag;
  }
  calcCallBackHash_(msg) {
    let now = new Date();
    const cbHash = crypto.randomBytes(256).toString('hex') + JSON.stringify(msg) + now.toGMTString() + now.getMilliseconds() ;
    const cbRipemd = CryptoJS.RIPEMD160(cbHash).toString(CryptoJS.enc.Hex);
    const cbBuffer = Buffer.from(cbRipemd,'hex');
    return base32.encode(cbBuffer,bs32Option);
  }
  getAddress(resourceKey) {
    const resourceRipemd = CryptoJS.RIPEMD160(resourceKey).toString(CryptoJS.enc.Hex);
    const resourceBuffer = Buffer.from(resourceRipemd,'hex');
    return base32.encode(resourceBuffer,bs32Option);
    return 
  }
  
  onPeerInfo_(jMsg) {
    if( typeof this.cb_[jMsg.cb] === 'function') {
      this.cb_[jMsg.cb](jMsg.peerInfo);
    } else {
      console.log('DHTClient::onPeerInfo_ jMsg=<',jMsg,'>');
      console.log('DHTClient::onPeerInfo_ this.cb_=<',this.cb_,'>');
    }
  }
  onMeshMsg_(jMsg) {
    //console.log('DHTClient::onMeshMsg_ jMsg=<',jMsg,'>');
    if( typeof this.cb_[jMsg.cb] === 'function') {
      this.cb_[jMsg.cb](jMsg.result);
    } else {
      console.log('DHTClient::onMeshMsg_ jMsg=<',jMsg,'>');
      console.log('DHTClient::onMeshMsg_ this.cb_=<',this.cb_,'>');
    }
  }

}

module.exports = DHTClient;
