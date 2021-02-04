'use strict';
const debug_ = true;
const unix = require('unix-dgram');
const execSync = require('child_process').execSync;
const ApiUnxiUdp = require('./api_unxi_udp.js');
const DHTUdp = require('./dht.udp.js');
const DHTNode = require('./dht.node.js');
const DHTBucket = require('./dht.bucket.js');
const DHTUtils = require('./dht.utils.js');
const utils = new DHTUtils();

const client2broker = '/dev/shm/dht.pubsub.client2broker.sock';


class Broker {
  constructor(conf) {
    if(debug_) {
      console.log('Broker::constructor:conf=<',conf,'>');
    }
    const self = this;
    this.api_ = new ApiUnxiUdp((msg)=>{
      self.onApiMsg(msg);
    });
    this.api_.bindUnixSocket(client2broker);
    this.api_cbs_ = {};
    this.localChannels_ = {};
    this.node_ = new DHTNode(conf);
    this.bucket_ = new DHTBucket(this.node_);
    this.dht_udp_ = new DHTUdp(conf,this.node_,this.bucket_,(msg,remote,node)=>{
      self.onDHTDataMsg(msg,remote,node);
    });
    this.dht_udp_.bindSocket(conf.portc,conf.portd);
  }

  onDHTDataMsg(msg,remote,nodeFrom) {
    console.log('Broker::onDHTDataMsg:msg=<',msg,'>');
    console.log('Broker::onDHTDataMsg:remote=<',remote,'>');
    console.log('Broker::onDHTDataMsg:nodeFrom=<',nodeFrom,'>');
  }



  onApiMsg(msg) {
    //console.log('Broker::onApiMsg:msg=<',msg,'>');
    if(msg.client) {
      this.onApiClient(msg.client,msg.cb);
    } else if(msg.ping) {
      this.onApiPing(msg.at,msg.cb)
    } else if(msg.subscribe) {
      this.onApiSubscribe(msg.subscribe,msg.cb)
    } else if(msg.publish) {
      this.onApiPublish(msg.publish,msg.cb)
    } else {
      console.log('Broker::onApiMsg:msg=<',msg,'>');
    }
  }
  onApiClient(path,cb) {
    //console.log('Broker::onApiClient:path=<',path,'>');
    //console.log('Broker::onApiClient:cb=<',cb,'>');
    this.api_cbs_[cb] = {path:path,at:(new Date()).toISOString()};
    //console.log('Broker::onApiClient:this.api_cbs_=<',this.api_cbs_,'>');
    for(const cbKey in this.api_cbs_) {
      console.log('Broker::onApiClient:cbKey=<',cbKey,'>');
      const api_cb = this.api_cbs_[cbKey];
      const escape_ms = new Date() - new Date(api_cb.at);
      console.log('Broker::onApiClient:escape_ms=<',escape_ms,'>');
      if(escape_ms > 5000) {
        delete this.api_cbs_[cbKey];
      }
    }
    console.log('Broker::onApiClient:this.api_cbs_=<',this.api_cbs_,'>');
  }
  onApiPing(atSent,cb) {
    //console.log('Broker::onApiPing:cb=<',cb,'>');
    //console.log('Broker::onApiPing:this.api_cbs_=<',this.api_cbs_,'>');    
    const reply = this.api_cbs_[cb];
    if(reply) {
      //console.log('Broker::onApiPing:reply=<',reply,'>');
      //console.log('Broker::onApiPing:atSent=<',atSent,'>');
      reply.at = atSent;
      this.api_.send({pong:new Date,sent:atSent},reply.path);
    }
  }

  onApiSubscribe(channel,cb) {
    //console.log('Broker::onApiSubscribe:channel=<',channel,'>');
    //console.log('Broker::onApiSubscribe:cb=<',cb,'>');
    const address = utils.calcAddress(channel);
    //console.log('Broker::onApiSubscribe:address=<',address,'>');
    if(!this.localChannels_[address]) {
      this.localChannels_[address] = [];
    }
    this.localChannels_[address].push({channel:channel,cb:cb,at:new Date()});
    const outgates = this.bucket_.near(address);
    //console.log('Broker::onApiSubscribe:outgates=<',outgates,'>');
    this.dht_udp_.broadcastSubscribe(outgates,channel,cb);
    /*
    const gateEndPoint = {};
    for(const gate of outgates) {
      
    }
    */
  }
  onApiPublish(publish,cb) {
    //console.log('Broker::onApiPublish:publish=<',publish,'>');
    const channel = publish.c;
    const message = publish.m;
    //console.log('Broker::onApiPublish:channel=<',channel,'>');
    //console.log('Broker::onApiPublish:message=<',message,'>');
    const address = utils.calcAddress(channel);
    //console.log('Broker::onApiPublish:address=<',address,'>');
    const channelLocals = this.localChannels_[address];
    for(const channelLocal of channelLocals) {
      //console.log('Broker::onApiPublish:channelLocal=<',channelLocal,'>');
      const toPath = `/dev/shm/dht.pubsub.broker2client.${channelLocal.cb}.sock`;
      //console.log('Broker::onApiPublish:toPath=<',toPath,'>');
      const api_cb = this.api_cbs_[channelLocal.cb];
      if(api_cb) {
        this.api_.send({publisher:publish,at:new Date()},toPath);
      } else {
        const index = this.localChannels_[address].indexOf(channelLocal);
        //console.log('Broker::onApiPublish:index=<',index,'>');
        if(index > -1) {
          this.localChannels_[address].splice(index,1);
        }
      }
    }
  }
};
module.exports = Broker;
