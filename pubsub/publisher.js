'use strict';
const unix = require('unix-dgram');
const execSync = require('child_process').execSync;
'use strict';
const debug_ = true;
const DHTUtils = require('./dht.utils.js');
const ApiUnxiUdp = require('./api_unxi_udp.js');

const utils = new DHTUtils();
const client2broker = '/dev/shm/dht.pubsub.client2broker.sock';
const broker2client_cb = utils.random();
const broker2client = `/dev/shm/dht.pubsub.broker2client.${broker2client_cb}.sock`;

class Publisher {
  constructor() {
    if(debug_) {
    }
    const self = this;
    this.api_ = new ApiUnxiUdp((msg)=>{
      self.onApiMsg(msg);
    });
    this.api_.bindUnixSocket(broker2client);
    this.api_.doPing({ping:client2broker,at:new Date(),cb:broker2client_cb});
    this.send_({client:broker2client});
  }
  publish(channel,msg) {
    console.log('Publisher::publish: channel =<',channel,'>');
    console.log('Publisher::publish: msg =<',msg,'>');
    this.send_({publish:{c:channel,m:msg}});
  }



  onApiMsg(msg) {
    //console.log('Publisher::onApiMsg:msg=<',msg,'>');
    if(msg.pong) {
      this.onBrokerPong(msg.pong,msg.sent);
    } else if(msg.ping) {
    } else if(msg.subscribe) {
    } else {
      console.log('Publisher::onApiMsg:msg=<',msg,'>');
    }
  }
  
  onBrokerPong(pongAt,sentAt) {
    //console.log('Publisher::onBrokerPong:pongAt=<',pongAt,'>');
    //console.log('Publisher::onBrokerPong:sentAt=<',sentAt,'>');
    const escape_ms = new Date() - new Date(sentAt);
    //console.log('Publisher::onBrokerPong:escape_ms=<',escape_ms,'>');
  }

  send_(cmd) {
    cmd.cb = broker2client_cb;
    this.api_.send(cmd, client2broker);
  }
};
module.exports = Publisher;
