'use strict';
const unix = require('unix-dgram');
const execSync = require('child_process').execSync;
'use strict';
const debug_ = true;
const DHTUtils = require('./DHTUtils.js');
const ApiUnxiUdp = require('./api_unxi_udp.js');

const utils = new DHTUtils();
const client2broker = '/dev/shm/dht.pubsub.client2broker.sock';
const broker2client_cb = utils.random();
const broker2client = `/dev/shm/dht.pubsub.broker2client.${broker2client_cb}.sock`;

class Subscriber {
  constructor(onMsg) {
    if(debug_) {
    }
    this.onMsg_ = onMsg;
    const self = this;
    this.api_ = new ApiUnxiUdp((msg)=>{
      self.onApiMsg(msg);
    });
    this.api_.bindUnixSocket(broker2client);
    this.api_.doPing({ping:client2broker,at:new Date(),cb:broker2client_cb});
    this.send_({client:broker2client});
  }
  subscribe(channel) {
    //console.log('Subscriber::subscribe: channel =<',channel,'>');
    this.send_({subscribe:channel});
  }
  unsubscribe(channel) {
    //console.log('Subscriber::unsubscribe: channel =<',channel,'>');
    this.send_({unsubscribe:channel});
  }

  onApiMsg(msg) {
    //console.log('Subscriber::onApiMsg:msg=<',msg,'>');
    if(msg.pong) {
      this.onBrokerPong(msg.pong,msg.sent);
    } else if(msg.publisher) {
      this.onBrokerPublisher(msg.publisher,msg.at);
    } else {
      console.log('Subscriber::onApiMsg:msg=<',msg,'>');
    }
  }
  
  onBrokerPong(pongAt,sentAt) {
    //console.log('Subscriber::onBrokerPong:pongAt=<',pongAt,'>');
    //console.log('Subscriber::onBrokerPong:sentAt=<',sentAt,'>');
    const escape_ms = new Date() - new Date(sentAt);
    //console.log('Subscriber::onBrokerPong:escape_ms=<',escape_ms,'>');
  }

  onBrokerPublisher(publisher,at) {
    //console.log('Subscriber::onBrokerPublisher:publisher=<',publisher,'>');
    //console.log('Subscriber::onBrokerPublisher:at=<',at,'>');
    const escape_ms = new Date() - new Date(at);
    //console.log('Subscriber::onBrokerPublisher:escape_ms=<',escape_ms,'>');
    if(publisher && publisher.c && publisher.m) {
      if(typeof this.onMsg_ === 'function' ) {
        this.onMsg_(publisher.c,publisher.m);
      }
    }
  }


  send_(cmd) {
    cmd.cb = broker2client_cb;
    this.api_.send(cmd, client2broker);
  }
};
module.exports = Subscriber;
