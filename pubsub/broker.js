'use strict';
const debug_ = true;
const unix = require('unix-dgram');
const execSync = require('child_process').execSync;
const ApiUnxiUdp = require('./api_unxi_udp.js');
const client2broker = '/dev/shm/dht.pubsub.client2broker.sock';

class Broker {
  constructor(port) {
    if(debug_) {
      console.log('Broker::constructor:port=<',port,'>');
    }
    const self = this;
    this.api_ = new ApiUnxiUdp((msg)=>{
      self.onApiMsg(msg);
    });
    this.api_.bindUnixSocket(client2broker);
    this.api_cbs_ = {};
  }
  onApiMsg(msg) {
    //console.log('Broker::onApiMsg:msg=<',msg,'>');
    if(msg.client) {
      this.onApiClient(msg.client,msg.cb);
    } else if(msg.ping) {
      this.onApiPing(msg.at,msg.cb)
    } else if(msg.subscribe) {
      this.onApiSubscribe(msg.subscribe,msg.cb)
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
    console.log('Broker::onApiSubscribe:channel=<',channel,'>');
    console.log('Broker::onApiSubscribe:cb=<',cb,'>');
  }
};
module.exports = Broker;
