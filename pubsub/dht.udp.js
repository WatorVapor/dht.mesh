'use strict';
const dgram = require('dgram');
const DHTMachine = require('./dht.machine.js');
const DHTNode = require('./dht.node.js');
const debug_ = true;
class DHTUdp {
  constructor(conf,onMsg) {
    if(debug_) {
      console.log('DHTUdp::constructor: conf =<',conf,'>');
    }
    this.conf_ = conf;
    this.client_ = dgram.createSocket('udp6');
    this.onMsg_ = onMsg;
    this.machine_ = new DHTMachine({localhost:false});
    setTimeout(this.enterMesh_.bind(this),1000);
    this.node_ = new DHTNode(conf);    
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
        const result = this.node_.verify(jMsg);
        //console.log('DHTUdp::bindSocket: message result =<',result,'>');
        if(result) {
          const node = this.node_.calcID(jMsg);
          //console.log('DHTUdp::bindSocket: message node =<',node,'>');
          self.onRemoteMsg_(jMsg.p,remote,node);
        }
      } catch(err) {
        console.log('DHTUdp::bindSocket: message err =<',err,'>');
      }
    });
    udpServer.bind(port);
    this.port_ = port;
  }
  send(cmd,port,host) {
    const signedCmd = this.node_.sign(cmd);
    const cmdMsg = Buffer.from(JSON.stringify(signedCmd));
    try {
      this.client_.send(cmdMsg, 0, cmdMsg.length, port,host);
    } catch(err) {
      console.log('DHTUdp::send:err=<',err,'>');
    }
  }
  isMe(nodeid) {
    return nodeid === this.node_.id;
  }
  doDHTPing(ping,port,host) {
    this.send(ping,port,host);
  }
  
  enterMesh_() {
    //console.log('DHTUdp::enterMesh_: this.conf_ =<',this.conf_,'>');
    for(const entrance of this.conf_.entrances) {
      //console.log('DHTUdp::enterMesh_: entrance =<',entrance,'>');
      const entryMesh = {
        entry:{
          port:this.port_,
          at:new Date(),
        }
      }
      this.send(entryMesh,entrance.port,entrance.host);
    }
  }
  onRemoteMsg_(msg,remote,node) {
    if(typeof this.onMsg_ === 'function') {
      this.onMsg_(msg,remote,node);
    }
  }
};
module.exports = DHTUdp;
