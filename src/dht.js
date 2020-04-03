'use strict';
const os = require('os');
const dgram = require("dgram");
const PeerCrypto = require('./peer.crypto.js');
const PeerNetWork = require('./peer.network.js');
const PeerStorage = require('./peer.storage.js');
const PeerResource = require('./peer.resource.js');


class DHT {
  constructor(config) {
    this.config_ = config;
    this.crypto_ = new PeerCrypto(config);
    this.peer_ = new PeerNetWork(config);
    this.storage_ = new PeerStorage(config);
    if(this.config_.storage) {
      this.resource_ = new PeerResource(config);
    }
    this.info_ = {
      id:this.crypto_.id,
      peer:{
        host:this.peer_.host(),
        port:this.peer_.port()
      }
    };
    this.peer_.onPeerJoint = this.onPeerJoint_.bind(this);
    this.peer_.onPutByRemote = this.onPutRemote_.bind(this);
    this.peer_.onGetByRemote = this.onGetRemote_.bind(this);
    this.peer_.onGetResponse = this.onGetResponse_.bind(this);
    this.getInvokers_ = {};
  }
  peerInfo() {
    return this.info_;
  }
  async put(data,cb) {
    console.log('DHT::put data=<',data,'>');
    console.log('DHT::put cb=<',cb,'>');
    const address = this.crypto_.calcResourceAddress(data);
    console.log('DHT::put address=<',address,'>');
    if(this.config_.storage) {
      await this.resource_.put(address,data);
    }
    const putDataMsg = {
      address:address,
      cb:cb,
      put:{
        seed:this.info_.id,
        data:data
      }
    };
    this.peer_.publish(putDataMsg);
    return {address:address,seed:this.info_.id};
  }
  async putBatch(data,cb) {
    const jData = JSON.parse(data);
    //console.log('DHT::putBatch jData=<',jData,'>');
    //console.log('DHT::putBatch cb=<',cb,'>');
    const addressAll = [];
    await this.resource_.newBatch(cb);
    for(const address in jData) {
      //console.log('DHT::putBatch address=<',address,'>');
      const oneData = jData[address];
      if(this.config_.storage) {
        await this.resource_.putBatch(address,oneData,cb);
      }
      const putDataMsg = {
        address:address,
        cb:cb,
        put:{
          seed:this.info_.id,
          data:oneData
        }
      };
      this.peer_.publish(putDataMsg);      
    }
    await this.resource_.writeBatch(cb);
    return {address:Object.keys(jData),seed:this.info_.id};
  }
  async get(address,cb,invoke) {
    //console.log('DHT::get address=<',address,'>');
    //console.log('DHT::get cb=<',cb,'>');
    if(this.config_.storage) {
      const content = await this.resource_.get(address);
      //console.log('DHT::get content=<',content,'>');
      if(content) {
        if(typeof invoke === 'function') {
          invoke(content);
          return;
        }
      }
    }
    const getDataMsg = {
      address:address,
      cb:cb,
      get:{
        invoke:this.info_.id
      }
    };
    this.getInvokers_[cb] = invoke;
    this.peer_.publish(getDataMsg);      
  }

    
  // inside method.
  onPeerJoint_(peer) {
    console.log('DHT::onPeerJoint_ peer=<',peer,'>');
  }
  async onPutRemote_(address,resource) {
    //console.log('DHT::onPutRemote_ address=<',address,'>');
    //console.log('DHT::onPutRemote_ resource=<',resource,'>');
    if(this.config_.storage) {
      await this.resource_.put(address,resource.data);
    }
  }

  async onGetRemote_(address) {
    //console.log('DHT::onGetRemote_ address=<',address,'>');
    if(this.config_.storage) {
      const content = await this.resource_.get(address);
      //console.log('DHT::onGetRemote_ content=<',content,'>');
      return content;
    }
    return null;
  }

  async onGetResponse_(content,cb) {
    //console.log('DHT::onGetResponse_ content=<',content,'>');
    //console.log('DHT::onGetResponse_ cb=<',cb,'>');
    if(typeof this.getInvokers_[cb] === 'function') {
      this.getInvokers_[cb](content.contents);
      delete this.getInvokers_[cb];
    }
  }

}
module.exports = DHT;
