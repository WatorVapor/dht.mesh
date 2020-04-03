'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const crypto = require('crypto');
const RIPEMD160 = require('ripemd160');
const base32 = require("base32.js");
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
  put(data,cb) {
    //console.log('DHTClient::put data=<',data,'>');
    const msg = {
      store:'put',
      data:data
    };
    const cbTag = this.writeData_(msg);
    this.cb_[cbTag] = cb;
  }
  putBatch(data,cb) {
    //console.log('DHTClient::putBatch data=<',data,'>');
    const msg = {
      store:'putBatch',
      data:data
    };
    const cbTag = this.writeData_(msg);
    this.cb_[cbTag] = cb;
  }
  get(address,cb) {
    //console.log('DHTClient::get data=<',data,'>');
    const msg = {
      fetch:'get',
      address:address
    };
    const cbTag = this.writeData_(msg);
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
        } else if(jMsg.fetchResp) {
          this.onFetchResp_(jMsg);
        } else if(jMsg.store) {
          this.onStoreResp_(jMsg);
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
    const cbRipemd = new RIPEMD160().update(cbHash).digest('hex');
    const cbBuffer = Buffer.from(cbRipemd,'hex');
    return base32.encode(cbBuffer,bs32Option);
  }
  getAddress(resourceKey) {
    const resourceRipemd = new RIPEMD160().update(resourceKey).digest('hex');
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
  onStoreResp_(jMsg) {
    //console.log('DHTClient::onStoreResp_ jMsg=<',jMsg,'>');
    if( typeof this.cb_[jMsg.cb] === 'function') {
      this.cb_[jMsg.cb](jMsg.result);
    } else {
      console.log('DHTClient::onStoreResp_ jMsg=<',jMsg,'>');
      console.log('DHTClient::onStoreResp_ this.cb_=<',this.cb_,'>');
    }
  }

  async onFetchResp_(jMsg) {
    //console.log('DHTClient::onFetchResp_ jMsg=<',jMsg,'>');
    if(jMsg.fetchResp && jMsg.cb) {
      if(typeof this.cb_[jMsg.cb] === 'function') {
        const respObj = Object.assign({},jMsg.fetchResp);
        respObj.address = jMsg.address;
        this.cb_[jMsg.cb](respObj);
      }
    }
  }
}

module.exports = DHTClient;
