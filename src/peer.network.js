'use strict';
const os = require('os');
const dgram = require("dgram");
const PeerMachine = require('./peer.machine.js');
const PeerCrypto = require('./peer.crypto.js');
const PeerRoute = require('./peer.route.js');
const PeerBucket = require('./peer.bucket.js');

const iConstMaxTTRInMs = 1000 * 5;

class PeerNetWork {
  constructor(config,cb) {
    this.config = config;
    this.peers = {};
    this.cb_ = cb;

    this.crypto_ = new PeerCrypto(config);
    this.machine_ = new PeerMachine(config);
    this.bucket_ = new PeerBucket(this.crypto_);
    this.route_ = new PeerRoute(this.crypto_,this.bucket_);

    this.serverCtrl = dgram.createSocket('udp6');
    this.client = dgram.createSocket("udp6");
    let self = this;
    this.serverCtrl.on('listening', () => {
      self.onListenCtrlServer();
      if(typeof self.cb_ === 'function') {
        self.cb_();
      }
    });
    this.serverCtrl.on('message', (msg, rinfo) => {
      self.onMessageCtrlServer__(msg, rinfo)
    });
    try {
      this.serverCtrl.on('error', (err) => {
        //throw err;
        //console.log('PeerNetWork::constructor err=<',err,'>');
        //console.log('PeerNetWork::constructor typeof self.cb_=<',typeof self.cb_,'>');
        if(typeof self.cb_ === 'function') {
          self.cb_(err);
        }
      });
      this.serverCtrl.bind(config.listen.port);
    } catch( err ) {
      console.log('PeerNetWork::constructor err=<',err,'>');
    }
    this.replays_ = {};
  }
  host() {
    return this.machine_.readMachienIp();
  }
  port() {
    return this.config.listen.port;
  }

  publish(resource) {
    //console.log('PeerNetWork::publish resource=<',resource,'>');
    const relayPeer = this.route_.calcContent(resource.address);
    console.log('PeerNetWork::publish relayPeer=<',relayPeer,'>');
    if(relayPeer.min && relayPeer.min !== this.crypto_.id) {
      this.relayMsgTo_(relayPeer.min,resource);
    }
    if(relayPeer.max && relayPeer.max !== this.crypto_.id) {
      this.relayMsgTo_(relayPeer.max,resource);
    }
  }

  delivery(resource) {
    //console.log('PeerNetWork::delivery resource=<',resource,'>');
    const relayPeer = this.route_.calcPeer(resource.address);
    console.log('PeerNetWork::delivery relayPeer=<',relayPeer,'>');
    if(relayPeer.min && relayPeer.min !== this.crypto_.id) {
      this.relayMsgTo_(relayPeer.min,resource);
    }
    if(relayPeer.max && relayPeer.max !== this.crypto_.id) {
      this.relayMsgTo_(relayPeer.max,resource);
    }
  }
  

  onMessageCtrlServer__(msg, rinfo) {
    //console.log('onMessageCtrlServer__ msg=<',msg.toString('utf-8'),'>');
    //console.log('onMessageCtrlServer__ rinfo=<',rinfo,'>');
    try {
      const msgJson = JSON.parse(msg.toString('utf-8'));
      //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
      //console.log('onMessageCtrlServer__ this.config=<',this.config,'>');
      const good = this.crypto_.verify(msgJson);
      //console.log('onMessageCtrlServer__ good=<',good,'>');
      if (!good) {
        console.log('onMessageCtrlServer__ good=<', good, '>');
        console.log('onMessageCtrlServer__ msgJson=<', msgJson, '>');
        return;
      }
      const rPeerId = this.crypto_.calcID(msgJson);
      if (msgJson.entrance) {
        //console.log('onMessageCtrlServer__ msgJson=<', msgJson, '>');
        this.onNewNodeEntry__(rPeerId, rinfo.address, msgJson.listen,msgJson.trap);
      } else if (msgJson.welcome) {
        this.onWelcomeNode__(msgJson.welcome);
      } else if (msgJson.ping) {
        this.onPeerPing__(rPeerId,msgJson);
      } else if (msgJson.pong) {
        //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
        this.onPeerPong__(rPeerId, msgJson.pong);
      ////
      } else if (msgJson.publish) {
          //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
          this.onRemotePublish__(rPeerId, msgJson);
      } else if (msgJson.delivery) {
          //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
          this.onRemoteDelivery__(rPeerId, msgJson);
      } else {
        console.log('onMessageCtrlServer__ msgJson=<', msgJson, '>');
      }
    } catch (e) {
      console.log('onMessageCtrlServer__ e=<', e, '>');
      console.log('onMessageCtrlServer__ msg.toString("utf-8")=<', msg.toString('utf-8'), '>');
    }
  };

  onNewNodeEntry__(peerid, rAddress, listen,trap) {
    //console.log('onNewNodeEntry__ peerid=<',peerid,'>');
    //console.log('onNewNodeEntry__ rAddress=<',rAddress,'>');
    //console.log('onNewNodeEntry__ listen=<',listen,'>');
    //console.log('onNewNodeEntry__ this.peers=<',this.peers,'>');
    this.peers[peerid] = {
      host: rAddress,
      port: listen.port,
      trap:trap
    };
    //console.log('onNewNodeEntry__ this.peers=<', this.peers, '>');

    let msg = {
      welcome: this.peers
    };
    let msgSign = this.crypto_.sign(msg);
    const bufMsg = Buffer.from(JSON.stringify(msgSign));
    this.client.send(bufMsg, listen.port, rAddress, (err) => {
      //console.log('onNewNodeEntry__ err=<',err,'>');
    });
    for(const peerid in this.peers) {
      //console.log('onWelcomeNode__ peerid=<',peerid,'>');
      const peerNew = Object.assign({},this.peers[peerid]);
      this.bucket_.addPeer(peerid,this.peers[peerid].trap);
    }
  }
  onWelcomeNode__(welcome) {
    console.log('onWelcomeNode__ welcome=<',welcome,'>');
    this.peers = Object.assign(this.peers, welcome);
    //console.log('onWelcomeNode__ this.peers=<',this.peers,'>');
    try {
    } catch (e) {
      console.log('onWelcomeNode__ e=<', e, '>');
    }
    for(const peerid in this.peers) {
      //console.log('onWelcomeNode__ peerid=<',peerid,'>');
      const peerNew = Object.assign({},this.peers[peerid]);
      this.bucket_.addPeer(peerid,this.peers[peerid].trap);
    }
  }

  onPeerPing__(peerid,msgJson) {
    //console.log('onPeerPing__ peerid=<',peerid,'>');
    //console.log('onPeerPing__ msgJson=<',msgJson,'>');
    const sentTp = new Date(msgJson.sign.ts);
    sentTp.setMilliseconds(msgJson.sign.ms);
    //console.log('onPeerPing__ sentTp=<',sentTp,'>');
    const recieveTp = new Date();
    const tta = recieveTp - sentTp;
    //console.log('onPeerPing__ tta=<',tta,'>');
    if (this.peers[peerid]) {
      //console.log('onPeerPing__ this.peers[peerid]=<',this.peers[peerid],'>');
      this.peers[peerid].tta = tta;
      const peerInfo = this.peers[peerid];
      const now = new Date();
      let msg = {
        pong: {
          ping: {
            ts: sentTp.toGMTString(),
            ms: sentTp.getMilliseconds()
          },
          pong: {
            ts: now.toGMTString(),
            ms: now.getMilliseconds()
          }
        }
      };
      let msgSign = this.crypto_.sign(msg);
      const bufMsg = Buffer.from(JSON.stringify(msgSign));
      this.client.send(bufMsg, peerInfo.port, peerInfo.host, (err) => {
        //console.log('onPeerPing__ err=<',err,'>');
      });
    } else {
      //console.log('onPeerPing___ this.peers=<',this.peers,'>');
      //console.log('onPeerPing___ peerid=<',peerid,'>');
      //console.log('onPeerPing___ msgJson=<',msgJson,'>');
      this.peers[peerid] = Object.assign({}, msgJson.ping);
      //console.log('onPeerPing___ this.peers=<',this.peers,'>');
    }
    //console.log('onPeerPing___ this.peers=<',this.peers,'>');    
  }
  onPeerPong__(peerid, pong) {
    //console.log('onPeerPong__ peerid=<',peerid,'>');
    //console.log('onPeerPong__ pong=<',pong,'>');
    const now = new Date();
    const pingTp = new Date(pong.ping.ts);
    pingTp.setMilliseconds(pong.ping.ms);
    //console.log('onPeerPong__ pingTp=<',pingTp,'>');
    const ttr = now - pingTp;
    //console.log('onPeerPong__ ttr=<',ttr,'>');
    const peerInfo = this.peers[peerid];
    if (peerInfo) {
      //console.log('onPeerPong__ peerInfo=<',peerInfo,'>');
      peerInfo.ttr = ttr;
      if(peerInfo.pat) {
        delete peerInfo.pat;
      }
      //console.log('onPeerPong__ peerInfo=<',peerInfo,'>');
      if(ttr < iConstMaxTTRInMs) {
        this.bucket_.updatePeer(peerid,ttr);
      } else {
        this.bucket_.removePeer(peerid);
      }
    }
    //console.log('onPeerPong__ this.peers=<',JSON.stringify(this.peers,undefined,2),'>');
  }



  doClientEntry__(entrance, listen ,trap) {
    //console.log('doClientEntry__ entrance=<', entrance, '>');
    for (let address of entrance) {
      //console.log('doClientEntry__ address=<', address, '>');
      let msg = {
        entrance: true,
        listen: listen,
        trap:trap
      };
      let msgSign = this.crypto_.sign(msg);
      const bufMsg = Buffer.from(JSON.stringify(msgSign));
      this.client.send(bufMsg, address.port, address.host, (err) => {
        //console.log('doClientEntry__ err=<',err,'>');
      });
    }
  };

  async doClientPing__() {
    //console.log('doClientPing__ this.peers=<',this.peers,'>');
    this.eachRemotePeer__((peer, peerInfo) => {
      //console.log('doClientPing__ peer=<',peer,'>');
      if(peerInfo.pat) {
        //console.log('doClientPing__ peer=<',peer,'>');
        //console.log('doClientPing__ peerInfo=<',peerInfo,'>');
        this.bucket_.removePeer(peer);
        delete this.peers[peer];
        return;
      }
      peerInfo.pat = new Date().toGMTString();
      //console.log('doClientPing__ peerInfo=<',peerInfo,'>');
      let msg = {
        ping: peerInfo
      };
      let msgSign = this.crypto_.sign(msg);
      const bufMsg = Buffer.from(JSON.stringify(msgSign));
      this.client.send(bufMsg, peerInfo.port, peerInfo.host, (err) => {
        if(err) {
          console.log('doClientPing__ err=<',err,'>');
        }
      });
    });
    const self = this;
    setTimeout(()=>{
      self.doClientPing__();
    },1000*10);    
  };

  eachRemotePeer__(fn) {
    //console.log('eachRemotePeer__ this.peers=<',this.peers,'>');
    for (let peer in this.peers) {
      //console.log('eachRemotePeer__ peer=<',peer,'>');
      let peerInfo = this.peers[peer];
      //console.log('eachRemotePeer__ peerInfo=<',peerInfo,'>');
      if (peer !== this.crypto_.id) {
        fn(peer, peerInfo);
      }
    }
  }

  onListenCtrlServer(evt) {
    const address = this.serverCtrl.address();
    console.log('onListenCtrlServer address=<', address, '>');
    const self = this;
    setTimeout(()=>{
      self.doClientEntry__(self.config.entrance,self.config.listen,self.config.trap);
    },0);
    setTimeout(()=>{
      self.doClientPing__();
    },1000*1);
    this.peers[this.crypto_.id] = {
      host: this.machine_.readMachienIp(),
      ports: this.config.listen,
      trap:this.config.trap
    };
  };
  
  
  
  
  sendMessage_(dst,msg) {
    const dstPeer = this.peers[dst];
    //console.log('sendMessage_ dstPeer=<', dstPeer, '>');
    const dstHost = dstPeer.host;
    const dstPort = dstPeer.port;
    const msgSign = this.crypto_.sign(msg);
    //console.log('sendMessage_ msgSign=<', msgSign, '>');
    const msgBuff = Buffer.from(JSON.stringify(msgSign));
    this.client.send(msgBuff, dstPort, dstHost, (err) => {
      //console.log('sendMessage_ err=<',err,'>');
    });
  }

  relayMsgTo_(dst,msg) {
    //console.log('PeerNetWork::relayMsgTo_ dst=<', dst, '>');
    //console.log('PeerNetWork::relayMsgTo_ msg=<', msg, '>');
    if(dst) {
      this.sendMessage_(dst,msg);
    }
  }

  
  onRemotePublish__(peerFrom,remoteMsg) {
    //console.log('PeerNetWork::onRemotePublish__ peerFrom=<', peerFrom, '>');
    //console.log('PeerNetWork::onRemotePublish__ remoteMsg=<', remoteMsg, '>');
    const address = remoteMsg.address;
    const relayPeer = this.route_.calcContent(address);
    //console.log('PeerNetWork::onRemotePublish__ relayPeer=<',relayPeer,'>');
    if(remoteMsg.footprint && remoteMsg.footprint.length > 0 ) {
      remoteMsg.footprint.push(this.crypto_.id);
    }
    if(relayPeer.min === this.crypto_.id || relayPeer.max === this.crypto_.id) {
      this.onRemotePublish(remoteMsg);
    } else if(relayPeer.min !== peerFrom) {
      this.relayMsgTo_(relayPeer.min,remoteMsg);
    } else if(relayPeer.max !== peerFrom) {
      this.relayMsgTo_(relayPeer.max,remoteMsg);
    }
  }

  onRemoteDelivery__(peerFrom,remoteMsg) {
    //console.log('PeerNetWork::onRemoteDelivery__ peerFrom=<', peerFrom, '>');
    //console.log('PeerNetWork::onRemoteDelivery__ remoteMsg=<', remoteMsg, '>');
    if(remoteMsg.peer === this.crypto_.id) {
      this.onRemoteDelivery(remoteMsg);
      return;
    }
    const address = remoteMsg.address;
    const relayPeer = this.route_.calcContent(address);
    //console.log('PeerNetWork::onRemoteDelivery__ relayPeer=<',relayPeer,'>');
    if(remoteMsg.footprint && remoteMsg.footprint.length > 0 ) {
      remoteMsg.footprint.push(this.crypto_.id);
    }
    if(relayPeer.min !== peerFrom) {
      this.relayMsgTo_(relayPeer.min,remoteMsg);
    } else if(relayPeer.max !== peerFrom) {
      this.relayMsgTo_(relayPeer.max,remoteMsg);
    }
  }

}

module.exports = PeerNetWork;
