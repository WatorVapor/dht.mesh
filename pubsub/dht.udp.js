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
    this.worldNodes_ = {};
    setInterval(this.doDHTPing_.bind(this),1*1000);
  }
  
  bindSocket(portc,portd) {
    const self = this;
    const udpServerCtrl = dgram.createSocket('udp6');
    udpServerCtrl.on('listening', () => {
      //console.log('DHTUdp::bindSocket: listening udpServerCtrl =<',udpServerCtrl,'>');
    });
    udpServerCtrl.on('message', (message, remote) =>{
      //console.log('DHTUdp::bindSocket: message message =<',message.toString(),'>');
      //console.log('DHTUdp::bindSocket: message remote =<',remote,'>');
      try {
        const jMsg = JSON.parse(message.toString());
        const result = this.node_.verify(jMsg);
        //console.log('DHTUdp::bindSocket: message result =<',result,'>');
        if(result) {
          const node = this.node_.calcID(jMsg);
          //console.log('DHTUdp::bindSocket: message node =<',node,'>');
          self.onCtrlMsg_(jMsg.p,remote,node);
        }
      } catch(err) {
        console.log('DHTUdp::bindSocket: message err =<',err,'>');
      }
    });
    udpServerCtrl.bind(portc);
    this.portc_ = portc;

    const udpServerData = dgram.createSocket('udp6');
    udpServerData.on('listening', () => {
      //console.log('DHTUdp::bindSocket: listening udpServerData =<',udpServerData,'>');
    });
    udpServerData.on('message', (message, remote) =>{
      //console.log('DHTUdp::bindSocket: message message =<',message.toString(),'>');
      //console.log('DHTUdp::bindSocket: message remote =<',remote,'>');
      try {
        const jMsg = JSON.parse(message.toString());
        const result = this.node_.verify(jMsg);
        //console.log('DHTUdp::bindSocket: message result =<',result,'>');
        if(result) {
          const node = this.node_.calcID(jMsg);
          //console.log('DHTUdp::bindSocket: message node =<',node,'>');
          self.onDataMsg_(jMsg.p,remote,node);
        }
      } catch(err) {
        console.log('DHTUdp::bindSocket: message err =<',err,'>');
      }
    });
    udpServerData.bind(portd);
    this.portd_ = portd;
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
  
  enterMesh_() {
    //console.log('DHTUdp::enterMesh_: this.conf_ =<',this.conf_,'>');
    for(const entrance of this.conf_.entrances) {
      //console.log('DHTUdp::enterMesh_: entrance =<',entrance,'>');
      const entryMesh = {
        entry:{
          portc:this.portc_,
          portd:this.portd_,
          at:new Date(),
        }
      }
      this.send(entryMesh,entrance.portc,entrance.host);
    }
  }
  onCtrlMsg_(msg,remote,nodeFrom) {
    //console.log('DHTUdp::onCtrlMsg_:msg=<',msg,'>');
    //console.log('DHTUdp::onCtrlMsg_:remote=<',remote,'>');
    //console.log('DHTUdp::onCtrlMsg_:nodeFrom=<',nodeFrom,'>');
    if(msg.entry) {
      this.onDHTEntry(msg.entry,remote,nodeFrom);
    } else if(msg.welcome) {
      this.onDHTWelcome(msg.welcome,remote,nodeFrom);
    } else if(msg.ping) {
      this.onDHTPing(msg.ping,remote,nodeFrom);
    } else if(msg.pong) {
      this.onDHTPong(msg.pong,remote,nodeFrom);
    } else {
      console.log('DHTUdp::onCtrlMsg_:msg=<',msg,'>');
      console.log('DHTUdp::onCtrlMsg_:remote=<',remote,'>');
      console.log('DHTUdp::onCtrlMsg_:nodeFrom=<',nodeFrom,'>');
    }
  }
  onDHTEntry(entry,remote,nodeFrom) {
    console.log('DHTUdp::onDHTEntry:entry=<',entry,'>');
    //console.log('DHTUdp::onDHTEntry:remote=<',remote,'>');
    //console.log('DHTUdp::onDHTEntry:nodeFrom=<',nodeFrom,'>');
    const address = remote.address;
    const portc = entry.portc;
    const portd = entry.portd;
    //console.log('DHTUdp::onDHTEntry:address=<',address,'>');
    //console.log('DHTUdp::onDHTEntry:portc=<',portc,'>');
    this.worldNodes_[nodeFrom] = {
      address:address,
      portc:portc,
      portd:portd,
      at:new Date().toISOString()
    }
    const welcome = {
      welcome:{
        nodes:this.worldNodes_,
        at:new Date().toISOString()
      }
    };
    this.send(welcome,portc,address);
    //console.log('DHTUdp::onDHTEntry:this.worldNodes_=<',this.worldNodes_,'>');
  }
  onDHTWelcome(welcome,remote,nodeFrom) {
    //console.log('DHTUdp::onDHTWelcome:welcome=<',welcome,'>');
    //console.log('DHTUdp::onDHTWelcome:remote=<',remote,'>');
    //console.log('DHTUdp::onDHTWelcome:nodeFrom=<',nodeFrom,'>');
    for(const nodeKey in welcome.nodes) {
      //console.log('DHTUdp::onDHTWelcome:nodeKey=<',nodeKey,'>');
      const endpoint = welcome.nodes[nodeKey];
      //console.log('DHTUdp::onDHTWelcome:endpoint=<',endpoint,'>');
      this.worldNodes_[nodeKey] = endpoint;
    }
    //console.log('DHTUdp::onDHTWelcome:this.worldNodes_=<',this.worldNodes_,'>');
  }
  onDHTPing(ping,remote,nodeFrom) {
    //console.log('DHTUdp::onDHTPing:ping=<',ping,'>');
    //console.log('DHTUdp::onDHTPing:remote=<',remote,'>');
    //console.log('DHTUdp::onDHTPing:nodeFrom=<',nodeFrom,'>');
    const node = this.worldNodes_[nodeFrom];
    //console.log('DHTUdp::onDHTPing:node=<',node,'>');
    if(node) {
      const pong = {
        pong:{
          s:ping.s,
          r:new Date()
        }
      };
      this.send(pong,node.portc,node.address);
    }
  }

  onDHTPong(pong,remote,nodeFrom) {
    //console.log('DHTUdp::onDHTPong:pong=<',pong,'>');
    //console.log('DHTUdp::onDHTPong:remote=<',remote,'>');
    //console.log('DHTUdp::onDHTPong:nodeFrom=<',nodeFrom,'>');
    const node = this.worldNodes_[nodeFrom];
    //console.log('DHTUdp::onDHTPong:node=<',node,'>');
    if(node) {
      const ttl = new Date() - new Date(pong.s);
      //console.log('DHTUdp::onDHTPong:ttl=<',ttl,'>');
      node.ttl = ttl;
      node.at = pong.r;
      console.log('DHTUdp::onDHTPong:nodeFrom=<',nodeFrom,'>');
      console.log('DHTUdp::onDHTPong:node=<',node,'>');
    }
  }

  
  doDHTPing_() {
    //console.log('DHTUdp::doDHTPing_:this.worldNodes_=<',this.worldNodes_,'>');
    for(const nodeKey in this.worldNodes_) {
      //console.log('DHTUdp::doDHTPing_:nodeKey=<',nodeKey,'>');
      const node = this.worldNodes_[nodeKey];
      //console.log('DHTUdp::doDHTPing_:node=<',node,'>');
      if(nodeKey !== this.node_.id) {
        //console.log('DHTUdp::doDHTPing_:node=<',node,'>');
        //console.log('DHTUdp::doDHTPing_:nodeKey=<',nodeKey,'>');
        const pingDHT = {
          ping:{
            s:new Date()
          }
        };
        this.send(pingDHT,node.portc,node.address);
      }
    }
  }



  onDataMsg_(msg,remote,node) {
  }
};
module.exports = DHTUdp;
