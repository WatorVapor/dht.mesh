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
    this.cb_ = cb;

    this.crypto_ = new PeerCrypto(config);
    this.machine_ = new PeerMachine(config);
    this.bucket_ = new PeerBucket(this.crypto_);
    this.route_ = new PeerRoute(this.crypto_,this.bucket_);

    this.serverCtrl = dgram.createSocket('udp6');
    //this.client = dgram.createSocket("udp6");
    this.client = this.serverCtrl;
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
      if(rPeerId !== this.crypto_.id) {
        this.bucket_.remotePeer(rPeerId, rinfo,msgJson.t);
      }
      const payload = msgJson.p;
      if(payload) {
        this.onGoodPeerMsg_(payload,rPeerId,rinfo,msgJson.s);
      } else {
        console.log('onMessageCtrlServer__ good=<', good, '>');
        console.log('onMessageCtrlServer__ msgJson=<', msgJson, '>');        
      }
    } catch (e) {
      console.log('onMessageCtrlServer__ e=<', e, '>');
      console.log('onMessageCtrlServer__ msg.toString("utf-8")=<', msg.toString('utf-8'), '>');
    }
  };
  
  onGoodPeerMsg_(payload,rPeerId,rinfo,sign) {
    if (payload.entrance) {
      //console.log('onMessageCtrlServer__ payload=<', payload, '>');
      this.onNewNodeEntry__(rPeerId, rinfo);
    } else if (payload.welcome) {
      this.onWelcomeNode__(payload.welcome);
    } else if (payload.ping) {
      this.onPeerPing__(rPeerId,payload,sign);
    } else if (payload.pong) {
      //console.log('onMessageCtrlServer__ payload=<',payload,'>');
      this.onPeerPong__(rPeerId, payload.pong);
    } else if (payload.publish) {
        //console.log('onMessageCtrlServer__ payload=<',payload,'>');
        this.onRemotePublish__(rPeerId, payload);
    } else if (payload.delivery) {
        //console.log('onMessageCtrlServer__ payload=<',payload,'>');
        this.onRemoteDelivery__(rPeerId, payload);
    } else {
      console.log('onMessageCtrlServer__ payload=<', payload, '>');
    }    
  }

  onNewNodeEntry__(peerid, rinfo) {
    //console.log('onNewNodeEntry__ peerid=<',peerid,'>');
    console.log('onNewNodeEntry__ rinfo=<',rinfo,'>');
    const remotePeers = this.bucket_.fetchPeerInfo();
    //console.log('onNewNodeEntry__ remotePeers=<', remotePeers, '>');
    remotePeers[this.crypto_.id] = {
      address:this.host(),
      port:this.port()
    }
    const msg = {
      welcome: remotePeers
    };
    this.sendCtrlMsg(msg,rinfo);
  }
  onWelcomeNode__(welcome) {
    console.log('onWelcomeNode__ welcome=<',welcome,'>');
  }

  onPeerPing__(peerid,payload,sign) {
    //console.log('onPeerPing__ peerid=<',peerid,'>');
    //console.log('onPeerPing__ payload=<',payload,'>');
    //console.log('onPeerPing__ sign=<',sign,'>');
    const sentTp = new Date(sign.t);
    sentTp.setMilliseconds(sign.m);
    //console.log('onPeerPing__ sentTp=<',sentTp,'>');
    const recieveTp = new Date();
    const tta = recieveTp - sentTp;
    //console.log('onPeerPing__ tta=<',tta,'>');
    const peers = this.bucket_.fetchPeerInfo();
    if (peers[peerid]) {
      //console.log('onPeerPing__ peers[peerid]=<',peers[peerid],'>');
      peers[peerid].tta = tta;
      const peerInfo = peers[peerid];
      const now = new Date();
      const msg = {
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
      this.sendCtrlMsg(msg,peerInfo);
    } else {
      //console.log('onPeerPing___ peerid=<',peerid,'>');
      //console.log('onPeerPing___ sign=<',sign,'>');
    }
  }
  onPeerPong__(peerid, pong) {
    console.log('onPeerPong__ peerid=<',peerid,'>');
    console.log('onPeerPong__ pong=<',pong,'>');
    const now = new Date();
    const pingTp = new Date(pong.ping.ts);
    pingTp.setMilliseconds(pong.ping.ms);
    //console.log('onPeerPong__ pingTp=<',pingTp,'>');
    const ttr = now - pingTp;
    //console.log('onPeerPong__ ttr=<',ttr,'>');
    const peers = this.bucket_.fetchPeerInfo();
    const peerInfo = peers[peerid];
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



  doClientEntry__(entrance) {
    //console.log('doClientEntry__ entrance=<', entrance, '>');
    for (let address of entrance) {
      //console.log('doClientEntry__ address=<', address, '>');
      const msg = {
        entrance: entrance
      };
      this.sendCtrlMsg(msg,address);
    }
  };

  async doClientPing__() {
    this.eachRemotePeer__((peer, peerInfo) => {
      //console.log('doClientPing__ peer=<',peer,'>');
      if(peerInfo.pat) {
        //console.log('doClientPing__ peer=<',peer,'>');
        //console.log('doClientPing__ peerInfo=<',peerInfo,'>');
        this.bucket_.removePeer(peer);
        return;
      }
      peerInfo.pat = new Date().toGMTString();
      //console.log('doClientPing__ peerInfo=<',peerInfo,'>');
      const msg = {
        ping: peerInfo
      };
      this.sendCtrlMsg(msg,peerInfo);
    });
    const self = this;
    setTimeout(()=>{
      self.doClientPing__();
    },1000*10);    
  };

  eachRemotePeer__(fn) {
    //console.log('eachRemotePeer__ this.peers=<',this.peers,'>');
    const peers = this.bucket_.fetchPeerInfo();
    for (let peer in peers) {
      //console.log('eachRemotePeer__ peer=<',peer,'>');
      let peerInfo = peers[peer];
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
      self.doClientEntry__(self.config.entrance);
    },0);
    setTimeout(()=>{
      self.doClientPing__();
    },1000*1);
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
  
  sendCtrlMsg(msg,address) {
    const msgSign = this.crypto_.sign(msg);
    //console.log('sendCtrlMsg msgSign=<',msgSign,'>');
    const bufMsg = Buffer.from(JSON.stringify(msgSign));
    this.client.send(bufMsg, address.port, address.host, (err) => {
      if(err) {
        console.log('sendCtrlMsg err=<',err,'>');
      }
    });    
  }

}

module.exports = PeerNetWork;
