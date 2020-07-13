'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const DefaultDaemonListenChannel = 'dht.mesh.api.daemon.listen';
class DHTDaemon {
  constructor(dht,apiChannel) {
    this.dht_ = dht;
    this.remoteSubChannels_ = [];
    this.subscriber_ = redis.createClient(redisOption);
    if(apiChannel) {
      this.subscriber_.subscribe(apiChannel);
    } else {
      this.subscriber_.subscribe(DefaultDaemonListenChannel);
    }
    const self = this;
    this.subscriber_.on('message',async (channel,message) => {
      await self.onData_(message);
    });
    this.publisher_ = redis.createClient(redisOption);
    
    this.dht_.onRemoteSpreed = (msg)=> {
      self.onRemoteSpread_(msg);
    }
    this.dht_.onRemoteDelivery = (msg)=> {
      self.onRemoteDelivery_(msg);
    }
  }
  
  onConnection_(connection) {
    //console.log('DHTDaemon::onConnection_:connection=<',connection,'>');
    try {
      connection.setNoDelay();
    } catch(e) {
      console.log('DHTDaemon::onConnection_::::e=<',e,'>');
    }
    const self = this;
    connection.on('data', (data) => {
      self.onData_(data,connection);
    });
  };

  async onData_ (data) {
    //console.log('DHTDaemon::onData_::data=<',data.toString(),'>');  
    try {
      const jMsg = JSON.parse(data.toString());
      //console.log('DHTDaemon::onData_::jMsg=<',jMsg,'>');
      if(jMsg) {
        if(jMsg.peerInfo) {
          await this.onPeerInfo_(jMsg);
        } else if(jMsg.spread) {
          await this.onSpreadData_(jMsg);
        } else if(jMsg.delivery) {
          await this.onDeliveryData_(jMsg);
        } else if(jMsg.subscribe) {
          this.onSubscribeData_(jMsg);
        } else {
          console.log('DHTDaemon::onData_::jMsg=<',jMsg,'>');
        }
      }
    } catch(e) {
      console.log('DHTDaemon::onData_::e=<',e,'>');
    }
  };


  async onPeerInfo_ (jMsg){
    const peer = this.dht_.peerInfo();
    //console.log('DHTDaemon::onPeerInfo_:: peer=<',peer,'>');
    const peerInfoResp = {
      peerInfo:peer,
      cb:jMsg.cb
    };
    const RespBuff = Buffer.from(JSON.stringify(peerInfoResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('DHTDaemon::onPeerInfo_::::e=<',e,'>');
    }
  };

  async onSpreadData_(jMsg) {
    //console.log('DHTDaemon::onSpreadData_::jMsg=<',jMsg,'>');
    const meshResp = {
      cb:jMsg.cb,
      spread:jMsg.spread
    };
    this.dht_.spread(jMsg.address,jMsg.spread,jMsg.cb);
    const RespBuff = Buffer.from(JSON.stringify(meshResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('DHTDaemon::onSpreadData_::::e=<',e,'>');
    }
  };

  async onDeliveryData_(jMsg) {
    //console.log('DHTDaemon::onDeliveryData_::jMsg=<',jMsg,'>');
    const meshResp = {
      cb:jMsg.cb,
      delivery:jMsg.delivery
    };
    this.dht_.delivery(jMsg.peer,jMsg.delivery,jMsg.cb);
    const RespBuff = Buffer.from(JSON.stringify(meshResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('DHTDaemon::onDeliveryData_::::e=<',e,'>');
    }
  };
  onSubscribeData_(jMsg) {
    //console.log('DHTDaemon::onSubscribeData_::jMsg=<',jMsg,'>');
    this.remoteSubChannels_.push(jMsg.channel);
  }

  onRemoteSpread_(spreadMsg) {
    //console.log('DHTDaemon::onRemoteSpread_ spreadMsg=<',spreadMsg,'>');
    for(const remoteSub of this.remoteSubChannels_) {
      const meshResp = {
        remoteSpread:spreadMsg
      };
      this.publisher_.publish(remoteSub,JSON.stringify(meshResp));
    }
  }
  onRemoteDelivery_(deliveryMsg) {
    //console.log('DHTDaemon::onRemoteDelivery_ deliveryMsg=<',deliveryMsg,'>');
    for(const remoteSub of this.remoteSubChannels_) {
      const meshResp = {
        remoteDelivery:deliveryMsg
      };
      this.publisher_.publish(remoteSub,JSON.stringify(meshResp));
    }
  }


};

module.exports = DHTDaemon;
