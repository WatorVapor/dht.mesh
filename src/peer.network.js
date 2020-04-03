'use strict';
const os = require('os');
const dgram = require("dgram");
const PeerMachine = require('./peer.machine.js');
const PeerCrypto = require('./peer.crypto.js');
const PeerRoute = require('./peer.route.js');

const iConstMaxTTRInMs = 1000 * 5;

class PeerNetWork {
  constructor(config) {
    this.config = config;
    this.peers = {};
    this.storePeers_ = {};
    this.peekPeers_ = {};

    this.crypto_ = new PeerCrypto(config);
    this.machine_ = new PeerMachine(config);
    this.route_ = new PeerRoute(this.crypto_);

    this.serverCtrl = dgram.createSocket("udp6");
    this.client = dgram.createSocket("udp6");
    let self = this;
    this.serverCtrl.on("listening", () => {
      self.onListenCtrlServer();
    });
    this.serverCtrl.on("message", (msg, rinfo) => {
      self.onMessageCtrlServer__(msg, rinfo)
    });
    this.serverCtrl.bind(config.listen.port);
    
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
    //console.log('PeerNetWork::publish relayPeer=<',relayPeer,'>');
    if(relayPeer.min !== this.crypto_.id) {
      this.relayMsgTo_(relayPeer.min,resource);
    }
    if(relayPeer.max !== this.crypto_.id) {
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
        this.onNewNodeEntry__(rPeerId, rinfo.address, msgJson.listen, msgJson.storage);
      } else if (msgJson.welcome) {
        this.onWelcomeNode__(msgJson.welcome);
      } else if (msgJson.ping) {
        this.onPeerPing__(rPeerId,msgJson);
      } else if (msgJson.pong) {
        //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
        this.onPeerPong__(rPeerId, msgJson.pong);
      } else if (msgJson.put) {
          //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
          this.onPut4Remote__(rPeerId, msgJson.put, msgJson.address, msgJson.cb);
      } else if (msgJson.putResp) {
          //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
          this.onPutResponse__(rPeerId, msgJson.putResp);
      } else if (msgJson.get) {
          //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
          this.onGet4Remote__(rPeerId, msgJson.get, msgJson.address, msgJson.cb);
      } else if (msgJson.getResp) {
          //console.log('onMessageCtrlServer__ msgJson=<',msgJson,'>');
          this.onGetResponse__(rPeerId, msgJson.getResp ,msgJson.address, msgJson.cb);
      } else {
        console.log('onMessageCtrlServer__ msgJson=<', msgJson, '>');
      }
    } catch (e) {
      console.log('onMessageCtrlServer__ e=<', e, '>');
      console.log('onMessageCtrlServer__ msg.toString("utf-8")=<', msg.toString('utf-8'), '>');
    }
  };

  onNewNodeEntry__(id, rAddress, listen,storage) {
    //console.log('onNewNodeEntry__ id=<',id,'>');
    //console.log('onNewNodeEntry__ rAddress=<',rAddress,'>');
    //console.log('onNewNodeEntry__ listen=<',listen,'>');
    //console.log('onNewNodeEntry__ this.peers=<',this.peers,'>');
    this.peers[id] = {
      host: rAddress,
      port: listen.port,
      storage:storage
    };
    if(storage) {
      this.storePeers_[id] = {
        host: rAddress,
        port: listen.port        
      }
    } else {
      this.peekPeers_[id] = {
        host: rAddress,
        port: listen.port        
      }      
    }
    //console.log('onNewNodeEntry__ this.peers=<', this.peers, '>');

    let msg = {
      welcome: this.peers
    };
    let msgSign = this.crypto_.sign(msg);
    const bufMsg = Buffer.from(JSON.stringify(msgSign));
    this.client.send(bufMsg, listen.port, rAddress, (err) => {
      //console.log('onNewNodeEntry__ err=<',err,'>');
    });
  }
  onWelcomeNode__(welcome) {
    console.log('onWelcomeNode__ welcome=<',welcome,'>');
    this.peers = Object.assign(this.peers, welcome);
    console.log('onWelcomeNode__ this.peers=<',this.peers,'>');
    try {
    } catch (e) {
      console.log('onWelcomeNode__ e=<', e, '>');
    }
    for(const peerid in this.peers) {
      console.log('onWelcomeNode__ peerid=<',peerid,'>');
      const peerNew = Object.assign({},this.peers[peerid]);
      if(peerNew.storage) {
        this.storePeers_[peerid] = peerNew;
      } else {
        this.peekPeers_[peerid] = peerNew;
      }
      this.route_.addPeer(peerid,peerNew.storage);
    }
  }

  onPeerPing__(peerid,msgJson) {
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
    if (this.peers[peerid]) {
      //console.log('onPeerPong__ this.peers[peerid]=<',this.peers[peerid],'>');
      this.peers[peerid].ttr = ttr;
      if(ttr < iConstMaxTTRInMs) {
        this.route_.updatePeer(peerid,ttr,this.peers[peerid].storage);
      } else {
        this.route_.removePeer(peerid);
      }
    }
    //console.log('onPeerPong__ this.peers=<',JSON.stringify(this.peers,undefined,2),'>');
  }



  doClientEntry__(entrance, listen ,storage) {
    console.log('doClientEntry__ entrance=<', entrance, '>');
    for (let address of entrance) {
      console.log('doClientEntry__ address=<', address, '>');
      let msg = {
        entrance: true,
        listen: listen,
        storage:storage
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
      //console.log('doClientPing__ peerInfo=<',peerInfo,'>');
      let msg = {
        ping: peerInfo
      };
      let msgSign = this.crypto_.sign(msg);
      const bufMsg = Buffer.from(JSON.stringify(msgSign));
      this.client.send(bufMsg, peerInfo.port, peerInfo.host, (err) => {
        //console.log('doClientPing__ err=<',err,'>');
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
      self.doClientEntry__(self.config.entrance,self.config.listen,self.config.storage);
    },0);
    setTimeout(()=>{
      self.doClientPing__();
    },1000*1);
    this.peers[this.crypto_.id] = {
      host: this.machine_.readMachienIp(),
      ports: this.config.listen,
      storage:this.config.storage
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
  onStore4Remote__(fromId, store) {
    //console.log('PeerNetWork::onStore4Remote__ fromId=<', fromId, '>');
    //console.log('PeerNetWork::onStore4Remote__ store=<', store, '>');
    const place = new PeerPlace(store.address,this.storePeers_,this.crypto_);
    //console.log('PeerNetWork::onStore4Remote__ place=<',place,'>');
    //console.log('PeerNetWork::onStore4Remote__:: this.crypto_.id=<',this.crypto_.id,'>');
    if(place.isFinal(this.crypto_.id)) {
      this.storage_.append(store);
    }
    if(place.nearest !== this.crypto_.id && place.nearest !== fromId) {
      this.relayStoreMessage_(place.nearest,store);
    }
    if(place.farthest !== this.crypto_.id && place.nearest !== place.farthest && place.farthest !== fromId) {
      this.relayStoreMessage_(place.farthest,store);
    }
  }
  onFetch4Remote__(fromId, fetch) {
    //console.log('PeerNetWork::onFetch4Remote__ fromId=<', fromId, '>');
    //console.log('PeerNetWork::onFetch4Remote__ fetch=<', fetch, '>');
    const place = new PeerPlace(fetch.address,this.storePeers_,this.crypto_);
    //console.log('PeerNetWork::onFetch4Remote__ place=<',place,'>');
    //console.log('PeerNetWork::onFetch4Remote__:: this.crypto_.id=<',this.crypto_.id,'>');
    if(place.isFinal(this.crypto_.id)) {
      const self = this;
      this.storage_.fetch(fetch,(localResource)=> {
        console.log('PeerNetWork::onFetch4Remote__:: localResource=<',localResource,'>');
        const fetchRespMsg = {
          fetchResp:localResource
        };
        fetchRespMsg.fetchResp.cb = fetch.cb;
        fetchRespMsg.fetchResp.address = fetch.address;
        self.sendMessage_(fromId,fetchRespMsg);        
      });
    }
    if(place.nearest !== this.crypto_.id && place.nearest !== fromId) {
      this.relayFetchMessage_(place.nearest,fetch);
    }
    if(place.farthest !== this.crypto_.id && place.nearest !== place.farthest && place.farthest !== fromId) {
      this.relayFetchMessage_(place.farthest,fetch);
    }
  }
  onFetchResponse__(fromId, fetchResp) {
    console.log('PeerNetWork::onFetchResponse__ fromId=<', fromId, '>');
    console.log('PeerNetWork::onFetchResponse__ fetchResp=<', fetchResp, '>');
    if(typeof this.replays_[fetchResp.cb] === 'function') {
      const respMsg = {
        fetchResp:fetchResp,
        cb:fetchResp.cb,
        remote:true,
        address:fetchResp.address
      };
      delete respMsg.fetchResp.cb;
      delete respMsg.fetchResp.address;
      this.replays_[respMsg.cb](respMsg);
    }
  }

  relayMsgTo_(dst,msg) {
    //console.log('PeerNetWork::relayMsgTo_ dst=<', dst, '>');
    //console.log('PeerNetWork::relayMsgTo_ msg=<', msg, '>');
    this.sendMessage_(dst,msg);
  }

  relayRespTo_(dst,msg) {
    //console.log('PeerNetWork::relayRespTo_ dst=<', dst, '>');
    //console.log('PeerNetWork::relayRespTo_ msg=<', msg, '>');
    this.sendMessage_(dst,msg);
  }
  
  onPut4Remote__(peerFrom,putInfo,address,cb) {
    //console.log('PeerNetWork::onPut4Remote__ peerFrom=<', peerFrom, '>');
    //console.log('PeerNetWork::onPut4Remote__ putInfo=<', putInfo, '>');
    //console.log('PeerNetWork::onPut4Remote__ address=<', address, '>');
    //console.log('PeerNetWork::onPut4Remote__ cb=<', cb, '>');
    const relayPeer = this.route_.calcContent(address);
    //console.log('PeerNetWork::onPut4Remote__ relayPeer=<',relayPeer,'>');
    const resource = {
      address:address,
      cb:cb,
      put: putInfo
    };
    if(relayPeer.min === this.crypto_.id || relayPeer.max === this.crypto_.id) {
      this.onPutByRemote(address,putInfo);
    } else if(relayPeer.min !== peerFrom) {
      this.relayMsgTo_(relayPeer.min,resource);
    } else if(relayPeer.max !== peerFrom) {
      this.relayMsgTo_(relayPeer.max,resource);
    }
  }
  async onGet4Remote__(peerFrom,getInfo,address,cb) {
    //console.log('PeerNetWork::onGet4Remote__ peerFrom=<', peerFrom, '>');
    //console.log('PeerNetWork::onGet4Remote__ getInfo=<', getInfo, '>');
    //console.log('PeerNetWork::onGet4Remote__ address=<', address, '>');
    //console.log('PeerNetWork::onGet4Remote__ cb=<', cb, '>');
    const relayPeer = this.route_.calcContent(address);
    const resource = {
      address:address,
      cb:cb,
      get: true
    };
    if(relayPeer.min === this.crypto_.id || relayPeer.max === this.crypto_.id) {
      if(typeof this.onGetByRemote === 'function') {
        this.onGet4Local__(getInfo,address,cb);
      }
    } else if(relayPeer.min !== peerFrom) {
      this.relayMsgTo_(relayPeer.min,resource);
    } else if(relayPeer.max !== peerFrom) {
      this.relayMsgTo_(relayPeer.max,resource);
    }
  }

  async onGet4Local__(getInfo,address,cb) {
    const contents = await this.onGetByRemote(address);
    if(contents) {
      //console.log('PeerNetWork::onGet4Local__ contents=<', contents, '>');
      const resp = {
        address:address,
        cb:cb,
        getResp: {
          contents:contents,
          invoke:getInfo.invoke
        }
      };
      //console.log('PeerNetWork::onGet4Local__ resp=<', resp, '>');
      const respPeer = this.route_.calcPeer(getInfo.invoke);
      //console.log('PeerNetWork::onGet4Local__ respPeer=<', respPeer, '>');
      if(respPeer.min !== this.crypto_.id) {
        this.relayRespTo_(respPeer.min,resp);
      }
    }
  }
  
  onGetResponse__(peerFrom,getResp,address,cb) {
    console.log('PeerNetWork::onGetResponse__ peerFrom=<', peerFrom, '>');
    console.log('PeerNetWork::onGetResponse__ getResp=<', getResp, '>');
    console.log('PeerNetWork::onGetResponse__ address=<', address, '>');
    console.log('PeerNetWork::onGetResponse__ cb=<', cb, '>');
    if(getResp.invoke === this.crypto_.id) {
      this.onGetResponse(getResp,cb);
    }
    /*
    const resp = {
      address:address,
      cb:cb,
      getResp: {
        contents:contents,
        invoke:getInfo.invoke
      }
    };
    //console.log('PeerNetWork::onGet4Local__ resp=<', resp, '>');
    const respPeer = this.route_.calcPeer(getInfo.invoke);
    //console.log('PeerNetWork::onGet4Local__ respPeer=<', respPeer, '>');
    if(respPeer.min !== this.crypto_.id) {
      this.relayRespTo_(respPeer.min,resp);
    }
    */
    
  }
}

module.exports = PeerNetWork;
