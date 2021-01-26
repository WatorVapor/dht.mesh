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
  constructor() {
    if(debug_) {
    }
    const self = this;
    this.api_ = new ApiUnxiUdp((msg)=>{
      self.onApiMsg(msg);
    });
    this.api_.bindUnixSocket(broker2client);
    this.send_({client:broker2client});
  }
  subscribe(channel) {
    console.log('Subscriber::subscribe: channel =<',channel,'>');
    this.send_({subscribe:channel});
  }

  onApiMsg(msg) {
    console.log('Subscriber::onApiMsg:msg=<',msg,'>');
  }

  send_(cmd) {
    cmd.cb = broker2client_cb;
    this.api_.send(cmd, client2broker);    
  }
};
module.exports = Subscriber;
