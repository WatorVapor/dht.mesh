'use strict';
const dgram = require('dgram');
const PeerMachine = require('./peer.machine.js');
const debug_ = true;
class DHTUdp {
  constructor(conf,onMsg) {
    if(debug_) {
      console.log('DHTUdp::constructor: conf =<',conf,'>');
    }
    this.conf_ = conf;
    this.client_ = dgram.createSocket('udp6');
    this.onMsg_ = onMsg;
    this.machine_ = new PeerMachine({localhost:false});
    setTimeout(this.enterMesh_.bind(this),1000);
  }
  
  bindSocket(port) {
    const udpServer = dgram.createSocket('udp6');
    udpServer.on('listening', () => {
      //console.log('DHTUdp::bindSocket: listening udpServer =<',udpServer,'>');
    });
    const self = this;
    udpServer.on('message', (message, remote) =>{
      //console.log('DHTUdp::bindSocket: message message =<',message.toString(),'>');
      //console.log('DHTUdp::bindSocket: message remote =<',remote,'>');
      try {
        const jMsg = JSON.parse(message.toString());
        if(typeof self.onMsg_ === 'function') {
          self.onMsg_(jMsg);
        }
      } catch(err) {
        console.log('DHTUdp::bindSocket: message err =<',err,'>');
      }
    });
    udpServer.bind(port);
    this.port_ = port;
  }
  send(cmd,port,host) {
    const cmdMsg = Buffer.from(JSON.stringify(cmd));
    try {
      this.client_.send(cmdMsg, 0, cmdMsg.length, port,host);
    } catch(err) {
      console.log('DHTUdp::send:err=<',err,'>');
    }
  }
  
  doPing(ping) {
    this.pingMsg_ = ping;
    setInterval(this.doPing_.bind(this),1000);    
  }
  doPing_() {
    this.pingMsg_.at = new Date();
    this.send(this.pingMsg_,this.pingMsg_.ping);
  }
  enterMesh_() {
    //console.log('DHTUdp::enterMesh_: this.conf_ =<',this.conf_,'>');
    const ipv6s = this.machine_.readMachienIp();
    console.log('DHTUdp::enterMesh_: ipv6s =<',ipv6s,'>');
    for(const entrance of this.conf_.entrances) {
      console.log('DHTUdp::enterMesh_: entrance =<',entrance,'>');
      const entryMesh = {
        entry:{
          port:this.port_,
          host:ipv6s,
          at:new Date(),
        }
      }
      this.send(entryMesh,entrance.port,entrance.host);
    }
  }
};
module.exports = DHTUdp;
