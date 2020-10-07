'use strict';
const redis = require('redis');
const redisOption = {
  path:'/dev/shm/dht.ermu.api.redis.sock'
};
const DefaultDaemonListenChannel = 'dht.mesh.api.daemon.listen';


class TWRedis {
  constructor(clientChannel) {
    this.createDaemonChannel_(clientChannel)
  }
  async onData_ (data) {
    //console.log('TWRedis::onData_::data=<',data.toString(),'>');  
    try {
      const jMsg = JSON.parse(data.toString());
      //console.log('TWRedis::onData_::jMsg=<',jMsg,'>');
      if(jMsg) {
        if(jMsg.peerInfo) {
          await this.onPeerInfo_(jMsg);
        } else if(jMsg.spread) {
          await this.onSpreadData_(jMsg);
        } else if(jMsg.delivery) {
          await this.onDeliveryData_(jMsg);
        } else if(jMsg.loopback) {
          await this.onLoopbackData_(jMsg);
        } else if(jMsg.subscribe) {
          this.onSubscribeData_(jMsg);
        } else if(jMsg.ping) {
          this.onPing_(jMsg);
        } else {
          console.log('TWRedis::onData_::jMsg=<',jMsg,'>');
        }
      }
    } catch(e) {
      console.log('TWRedis::onData_::e=<',e,'>');
    }
  };


  async onPeerInfo_ (jMsg){
    const peer = this.dht_.peerInfo();
    console.log('TWRedis::onPeerInfo_:: peer=<',peer,'>');
    const peerInfoResp = {
      peerInfo:peer,
      cb:jMsg.cb
    };
    const RespBuff = Buffer.from(JSON.stringify(peerInfoResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('TWRedis::onPeerInfo_::::e=<',e,'>');
    }
  };

  async onSpreadData_(jMsg) {
    //console.log('TWRedis::onSpreadData_::jMsg=<',jMsg,'>');
    const meshResp = {
      cb:jMsg.cb,
      spread:jMsg.spread
    };
    this.dht_.spread(jMsg.address,jMsg.spread,jMsg.cb);
    const RespBuff = Buffer.from(JSON.stringify(meshResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('TWRedis::onSpreadData_::::e=<',e,'>');
    }
  };

  async onDeliveryData_(jMsg) {
    //console.log('TWRedis::onDeliveryData_::jMsg=<',jMsg,'>');
    const meshResp = {
      cb:jMsg.cb,
      delivery:jMsg.delivery
    };
    this.dht_.delivery(jMsg.peer,jMsg.delivery,jMsg.cb);
    const RespBuff = Buffer.from(JSON.stringify(meshResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('TWRedis::onDeliveryData_::::e=<',e,'>');
    }
  };

  async onLoopbackData_(jMsg) {
    //console.log('TWRedis::onLoopbackData_::jMsg=<',jMsg,'>');
    try {
      const RespBuff = Buffer.from(JSON.stringify(jMsg),'utf-8');
      for(const remoteSub of this.remoteSubChannels_) {
        this.publisher_.publish(remoteSub,RespBuff);
      }
    } catch(e) {
      console.log('TWRedis::onLoopbackData_::::e=<',e,'>');
    }
  };
  onSubscribeData_(jMsg) {
    //console.log('TWRedis::onSubscribeData_::jMsg=<',jMsg,'>');
    this.remoteSubChannels_.push(jMsg.channel);
  }

  onRemoteSpread_(spreadMsg) {
    //console.log('TWRedis::onRemoteSpread_ spreadMsg=<',spreadMsg,'>');
    for(const remoteSub of this.remoteSubChannels_) {
      const meshResp = {
        remoteSpread:spreadMsg
      };
      this.publisher_.publish(remoteSub,JSON.stringify(meshResp));
    }
  }

  createDaemonChannel_(clientChannel) {
    this.subscriber_ = redis.createClient(redisOption);
    const self = this;
    this.subscriber_.on('ready',() => {
      console.log('TWRedis::createDaemonChannel_ subscriber_ ready');
      if(clientChannel) {
        self.subscriber_.subscribe(clientChannel);
      } else {
        self.subscriber_.subscribe(DefaultDaemonListenChannel);
      }
    })
    this.subscriber_.on('message',(channel,message) => {
      self.onData_(message);
    });    
    this.subscriber_.on('error', (error) => {
      console.log('TWRedis::createDaemonChannel_ subscriber_ error=<',error,'>');
      setTimeout(()=>{
        self.createDaemonChannel_(apiChannel);
      },1000);
    });
    
    this.publisher_ = redis.createClient(redisOption);
    this.subscriber_.on('ready',() => {
      console.log('TWRedis::createDaemonChannel_ publisher ready');
    })
    this.publisher_.on('error', (error) => {
      console.log('TWRedis::createDaemonChannel_ publisher_ error=<',error,'>');
      setTimeout(()=>{
        self.createDaemonChannel_();
      },1000);
    });
 }
 
 onPing_(jMsg) {
    const meshResp = {
      pong:true
    };
    const RespBuff = Buffer.from(JSON.stringify(meshResp),'utf-8');
    try {
      this.publisher_.publish(jMsg.channel,RespBuff);
    } catch(e) {
      console.log('TWRedis::onPing_::::e=<',e,'>');
    }   
 }
};

const { parentPort,workerData  } = require('worker_threads');
const twRedis = new TWRedis();
